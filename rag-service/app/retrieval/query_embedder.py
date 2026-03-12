"""Retrieval – encode a user query into an embedding vector."""

from __future__ import annotations

import logging
from typing import List

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()


class QueryEmbedder:
    """Embeds a user query using the same TEI endpoint used during ingestion."""

    async def embed(self, query: str) -> List[float]:
        """Return a single embedding vector for `query`."""
        try:
            import httpx  # type: ignore[import]

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.tei_base_url}/embed",
                    json={"inputs": query, "normalize": True},
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list):
                    if data and isinstance(data[0], list):
                        return data[0]
                    if data and isinstance(data[0], float):
                        return data
        except Exception as exc:  # noqa: BLE001
            log.error("Query embedding failed: %s", exc)

        # Return zero vector as fallback
        return [0.0] * settings.qdrant_vector_size
