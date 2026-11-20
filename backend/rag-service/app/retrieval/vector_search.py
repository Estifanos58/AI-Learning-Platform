"""Retrieval – vector and hybrid search with authorization filtering."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.retrieval.hybrid_search import HybridSearch
from app.retrieval.query_embedder import QueryEmbedder
from app.storage.qdrant_client import get_qdrant_client

log = logging.getLogger(__name__)
settings = get_settings()


class VectorSearch:
    """Executes hybrid (dense + sparse BM25 with RRF) search over authorized file IDs."""

    def __init__(self) -> None:
        self._embedder = QueryEmbedder()
        self._qdrant = get_qdrant_client()
        self._hybrid = HybridSearch()

    async def search(
        self,
        query: str,
        allowed_file_ids: List[str],
        top_k: int | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Execute hybrid dense + BM25 search over authorized file IDs,
        returning top-K chunks ordered by Reciprocal Rank Fusion.
        """
        if not allowed_file_ids:
            log.warning("No authorized file IDs; returning empty results")
            return []

        return await self._hybrid.search(
            query=query,
            allowed_file_ids=allowed_file_ids,
            top_k=top_k,
        )

    async def dense_search(
        self,
        query: str,
        allowed_file_ids: List[str],
        top_k: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Pure dense vector search (used directly or as benchmark baseline)."""
        if not allowed_file_ids:
            return []
        k = top_k or settings.retrieval_top_k
        query_vector = await self._embedder.embed(query)
        return await self._qdrant.search(
            query_vector=query_vector,
            file_ids=allowed_file_ids,
            top_k=k,
        )
