"""Retrieval – Qdrant vector search with authorization filtering."""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.config import get_settings
from app.retrieval.query_embedder import QueryEmbedder
from app.storage.qdrant_client import get_qdrant_client

log = logging.getLogger(__name__)
settings = get_settings()


class VectorSearch:
    """Executes semantic search over authorized file IDs only."""

    def __init__(self) -> None:
        self._embedder = QueryEmbedder()
        self._qdrant = get_qdrant_client()

    async def search(
        self,
        query: str,
        allowed_file_ids: List[str],
        top_k: int | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Embed query and return top-K chunks from Qdrant,
        filtered to `allowed_file_ids`.
        """
        if not allowed_file_ids:
            log.warning("No authorized file IDs; returning empty results")
            return []

        k = top_k or settings.retrieval_top_k
        query_vector = await self._embedder.embed(query)
        results = await self._qdrant.search(
            query_vector=query_vector,
            file_ids=allowed_file_ids,
            top_k=k,
        )
        log.debug(
            "Vector search returned %d results for query=%r", len(results), query[:80]
        )
        return results
