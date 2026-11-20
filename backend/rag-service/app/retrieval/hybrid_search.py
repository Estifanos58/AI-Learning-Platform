"""Retrieval – hybrid dense + sparse (BM25) search with Reciprocal Rank Fusion."""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.observability import RETRIEVAL_LATENCY_SECONDS
from app.retrieval.bm25 import BM25Okapi
from app.retrieval.query_embedder import QueryEmbedder
from app.storage.qdrant_client import get_qdrant_client

log = logging.getLogger(__name__)
settings = get_settings()


class HybridSearch:
    """
    Executes hybrid retrieval:
      1. Dense vector search via Qdrant.
      2. Sparse lexical search via BM25 over candidate chunks.
      3. Reciprocal Rank Fusion (RRF) with deduplication & relevance filtering.
    """

    def __init__(self) -> None:
        self._embedder = QueryEmbedder()
        self._qdrant = get_qdrant_client()

    async def search(
        self,
        query: str,
        allowed_file_ids: List[str],
        top_k: Optional[int] = None,
        rrf_k: int = 60,
        dense_weight: float = 1.0,
        sparse_weight: float = 0.8,
        min_relevance_score: float = 0.005,
    ) -> List[Dict[str, Any]]:
        if not allowed_file_ids or not query or not query.strip():
            return []

        k = top_k or settings.retrieval_top_k
        start_time = time.monotonic()

        # 1. Dense retrieval
        dense_results: List[Dict[str, Any]] = []
        try:
            query_vector = await self._embedder.embed(query)
            dense_results = await self._qdrant.search(
                query_vector=query_vector,
                file_ids=allowed_file_ids,
                top_k=max(k * 2, 20),
            )
        except Exception as exc:
            log.warning("Dense vector retrieval failed, falling back to sparse: %s", exc)

        # 2. Sparse (BM25) retrieval
        sparse_results: List[Dict[str, Any]] = []
        try:
            candidate_chunks = await self._qdrant.scroll_chunks(
                file_ids=allowed_file_ids,
                limit=max(k * 4, 100),
            )
            if candidate_chunks:
                corpus = [
                    (c.get("payload", {}).get("chunk_text") or "")
                    for c in candidate_chunks
                ]
                bm25 = BM25Okapi().fit(corpus)
                ranked_indices = bm25.rank(query, top_k=max(k * 2, 20))
                for idx, bm25_score in ranked_indices:
                    chunk_copy = dict(candidate_chunks[idx])
                    chunk_copy["score"] = bm25_score
                    sparse_results.append(chunk_copy)
        except Exception as exc:
            log.warning("Sparse BM25 retrieval failed, falling back to dense: %s", exc)

        # 3. Reciprocal Rank Fusion (RRF)
        fused = self._reciprocal_rank_fusion(
            dense_results=dense_results,
            sparse_results=sparse_results,
            rrf_k=rrf_k,
            dense_weight=dense_weight,
            sparse_weight=sparse_weight,
            top_k=k,
            min_relevance_score=min_relevance_score,
        )

        duration = time.monotonic() - start_time
        RETRIEVAL_LATENCY_SECONDS.labels(mode="hybrid").observe(duration)
        log.debug(
            "Hybrid retrieval returned %d results (dense=%d, sparse=%d) in %.3fs",
            len(fused),
            len(dense_results),
            len(sparse_results),
            duration,
        )
        return fused

    def _reciprocal_rank_fusion(
        self,
        dense_results: List[Dict[str, Any]],
        sparse_results: List[Dict[str, Any]],
        rrf_k: int,
        dense_weight: float,
        sparse_weight: float,
        top_k: int,
        min_relevance_score: float,
    ) -> List[Dict[str, Any]]:
        # Fall back directly if one side is empty
        if not dense_results and not sparse_results:
            return []
        if not dense_results:
            return sparse_results[:top_k]
        if not sparse_results:
            return dense_results[:top_k]

        scores: Dict[str, float] = {}
        chunks_by_id: Dict[str, Dict[str, Any]] = {}

        # Dense ranking scores
        for rank, item in enumerate(dense_results, start=1):
            cid = str(item.get("id") or item.get("payload", {}).get("chunk_id", ""))
            if not cid:
                continue
            scores[cid] = scores.get(cid, 0.0) + (dense_weight / (rrf_k + rank))
            if cid not in chunks_by_id:
                chunks_by_id[cid] = dict(item)

        # Sparse ranking scores
        for rank, item in enumerate(sparse_results, start=1):
            cid = str(item.get("id") or item.get("payload", {}).get("chunk_id", ""))
            if not cid:
                continue
            scores[cid] = scores.get(cid, 0.0) + (sparse_weight / (rrf_k + rank))
            if cid not in chunks_by_id:
                chunks_by_id[cid] = dict(item)

        # Sort descending by RRF fused score
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

        # Deduplication and relevance filtering
        seen_texts: set[str] = set()
        deduped_results: List[Dict[str, Any]] = []

        for cid in sorted_ids:
            score = scores[cid]
            if score < min_relevance_score:
                continue

            chunk = chunks_by_id[cid]
            text = (chunk.get("payload", {}).get("chunk_text") or "").strip()
            normalized_text = " ".join(text.split())
            if not normalized_text or normalized_text in seen_texts:
                continue

            seen_texts.add(normalized_text)
            chunk_with_score = dict(chunk)
            chunk_with_score["score"] = score
            chunk_with_score["retrieval_mode"] = "hybrid_rrf"
            deduped_results.append(chunk_with_score)

            if len(deduped_results) >= top_k:
                break

        return deduped_results
