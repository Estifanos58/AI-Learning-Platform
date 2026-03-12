"""Retrieval – cross-encoder reranker to improve chunk selection."""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()


class Reranker:
    """
    Reranks retrieved chunks using a cross-encoder scoring model.

    If reranking is disabled or the model is unavailable, the original
    order (by vector similarity) is returned trimmed to `top_n`.
    """

    async def rerank(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        top_n: int | None = None,
    ) -> List[Dict[str, Any]]:
        n = top_n or settings.reranker_top_n

        if not settings.reranker_enabled:
            return chunks[:n]

        try:
            return await self._cross_encode(query, chunks, n)
        except Exception as exc:  # noqa: BLE001
            log.warning("Reranker failed, falling back to vector order: %s", exc)
            return chunks[:n]

    async def _cross_encode(
        self, query: str, chunks: List[Dict[str, Any]], top_n: int
    ) -> List[Dict[str, Any]]:
        """
        Score query–chunk pairs via TEI /rerank endpoint (if available),
        otherwise use sentence-transformers cross-encoder locally.
        """
        try:
            import httpx  # type: ignore[import]

            texts = [c.get("payload", {}).get("chunk_text", "") for c in chunks]
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{settings.tei_base_url}/rerank",
                    json={"query": query, "texts": texts},
                )
                resp.raise_for_status()
                scores = resp.json()  # list of {"index": N, "score": F}
                ranked = sorted(scores, key=lambda x: x["score"], reverse=True)
                return [chunks[r["index"]] for r in ranked[:top_n]]
        except Exception:  # noqa: BLE001
            # Fallback: local sentence-transformers
            return self._local_rerank(query, chunks, top_n)

    def _local_rerank(
        self, query: str, chunks: List[Dict[str, Any]], top_n: int
    ) -> List[Dict[str, Any]]:
        try:
            from sentence_transformers import CrossEncoder  # type: ignore[import]

            model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            texts = [c.get("payload", {}).get("chunk_text", "") for c in chunks]
            pairs = [(query, t) for t in texts]
            scores = model.predict(pairs)
            ranked = sorted(zip(scores, chunks), key=lambda x: x[0], reverse=True)
            return [c for _, c in ranked[:top_n]]
        except ImportError:
            return chunks[:top_n]
