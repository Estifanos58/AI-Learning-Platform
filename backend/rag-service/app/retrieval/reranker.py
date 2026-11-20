"""Retrieval – cross-encoder reranker with model reuse and observable fallback behavior."""

from __future__ import annotations

import logging
import threading
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.observability import RERANKER_FALLBACKS_TOTAL, RERANKER_REQUESTS_TOTAL

log = logging.getLogger(__name__)
settings = get_settings()

_LOCAL_CROSS_ENCODER: Any = None
_LOCAL_MODEL_LOCK = threading.Lock()


def get_cached_cross_encoder() -> Any:
    """Return singleton cached CrossEncoder model instance."""
    global _LOCAL_CROSS_ENCODER
    if _LOCAL_CROSS_ENCODER is None:
        with _LOCAL_MODEL_LOCK:
            if _LOCAL_CROSS_ENCODER is None:
                from sentence_transformers import CrossEncoder  # type: ignore[import]

                _LOCAL_CROSS_ENCODER = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _LOCAL_CROSS_ENCODER


class Reranker:
    """
    Reranks retrieved chunks using a cross-encoder scoring model.
    Falls back gracefully and observably: TEI endpoint -> cached local CrossEncoder -> initial retrieval order.
    """

    async def rerank(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        top_n: int | None = None,
    ) -> List[Dict[str, Any]]:
        n = top_n or settings.reranker_top_n

        if not chunks:
            return []

        if not settings.reranker_enabled:
            return chunks[:n]

        try:
            return await self._cross_encode(query, chunks, n)
        except Exception as exc:  # noqa: BLE001
            log.warning("All reranking mechanisms failed, falling back to initial retrieval order: %s", exc)
            RERANKER_FALLBACKS_TOTAL.labels(fallback_type="unhandled_to_vector_order").inc()
            RERANKER_REQUESTS_TOTAL.labels(status="fallback").inc()
            return chunks[:n]

    async def _cross_encode(
        self, query: str, chunks: List[Dict[str, Any]], top_n: int
    ) -> List[Dict[str, Any]]:
        # 1. Attempt TEI /rerank endpoint
        try:
            import httpx

            texts = [c.get("payload", {}).get("chunk_text", "") for c in chunks]
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{settings.tei_base_url.rstrip('/')}/rerank",
                    json={"query": query, "texts": texts},
                )
                resp.raise_for_status()
                scores = resp.json()  # list of {"index": N, "score": F}
                ranked = sorted(scores, key=lambda x: x["score"], reverse=True)
                reranked_chunks: List[Dict[str, Any]] = []
                for r in ranked[:top_n]:
                    idx = r["index"]
                    c = dict(chunks[idx])
                    c["rerank_score"] = r["score"]
                    c["rerank_method"] = "tei"
                    reranked_chunks.append(c)
                RERANKER_REQUESTS_TOTAL.labels(status="tei").inc()
                return reranked_chunks
        except Exception as tei_exc:
            log.warning("TEI /rerank endpoint unavailable (%s); falling back to local CrossEncoder", tei_exc)
            RERANKER_FALLBACKS_TOTAL.labels(fallback_type="tei_to_local").inc()

        # 2. Fallback to cached local sentence-transformers CrossEncoder
        try:
            return self._local_rerank(query, chunks, top_n)
        except Exception as local_exc:
            log.warning(
                "Local CrossEncoder failed (%s); falling back to initial retrieval order",
                local_exc,
            )
            RERANKER_FALLBACKS_TOTAL.labels(fallback_type="local_to_vector_order").inc()
            RERANKER_REQUESTS_TOTAL.labels(status="fallback").inc()
            return chunks[:top_n]

    def _local_rerank(
        self, query: str, chunks: List[Dict[str, Any]], top_n: int
    ) -> List[Dict[str, Any]]:
        model = get_cached_cross_encoder()
        texts = [c.get("payload", {}).get("chunk_text", "") for c in chunks]
        pairs = [(query, t) for t in texts]
        scores = model.predict(pairs)
        ranked = sorted(zip(scores, chunks), key=lambda x: x[0], reverse=True)
        reranked_chunks: List[Dict[str, Any]] = []
        for score, c in ranked[:top_n]:
            item = dict(c)
            item["rerank_score"] = float(score)
            item["rerank_method"] = "local_cross_encoder"
            reranked_chunks.append(item)
        RERANKER_REQUESTS_TOTAL.labels(status="local").inc()
        return reranked_chunks
