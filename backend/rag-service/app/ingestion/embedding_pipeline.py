"""Ingestion – embedding pipeline (TEI + Qdrant upsert)."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.ingestion.chunker import TextChunk
from app.storage.models import ChunkPayload
from app.storage.qdrant_client import QdrantClient, get_qdrant_client

log = logging.getLogger(__name__)
settings = get_settings()

EMBEDDING_MODEL_VERSION = "bge-large-en-v1.5-v1"


class EmbeddingPipeline:
    """
    Embeds text chunks via Hugging Face TEI and upserts to Qdrant.
    """

    def __init__(
        self,
        qdrant_client: Optional[QdrantClient] = None,
    ) -> None:
        self._qdrant = qdrant_client or get_qdrant_client()

    async def embed_and_store(
        self,
        chunks: List[TextChunk],
        file_id: str,
        owner_id: str,
        user_id: str,
        folder_id: Optional[str],
        extraction_version: str,
    ) -> int:
        """Embed chunks and upsert to Qdrant. Returns number of points stored."""
        if not chunks:
            return 0

        texts = [c.text for c in chunks]
        vectors = await self._embed(texts)

        points: List[Dict[str, Any]] = []
        for chunk, vector in zip(chunks, vectors):
            point_id = self._qdrant.deterministic_point_id(
                file_id=file_id,
                chunk_index=chunk.index,
                extraction_version=extraction_version,
                embedding_model_version=EMBEDDING_MODEL_VERSION,
            )
            payload = ChunkPayload(
                chunk_id=point_id,
                file_id=file_id,
                owner_id=owner_id,
                user_id=user_id,
                folder_id=folder_id,
                chunk_index=chunk.index,
                chunk_text=chunk.text,
                embedding_model=EMBEDDING_MODEL_VERSION,
                extraction_version=extraction_version,
            )
            points.append(
                {
                    "id": point_id,
                    "vector": vector,
                    "payload": payload.to_dict(),
                }
            )

        await self._qdrant.upsert_chunks(points)
        log.info(
            "Stored %d vectors for file_id=%s", len(points), file_id
        )
        return len(points)

    async def _embed(self, texts: List[str]) -> List[List[float]]:
        """Batch embed texts using HF TEI endpoint."""
        all_embeddings: List[List[float]] = []
        batch_size = settings.embedding_batch_size

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            embeddings = await self._call_tei(batch)
            all_embeddings.extend(embeddings)

        return all_embeddings

    async def _call_tei(self, texts: List[str]) -> List[List[float]]:
        """Call HF TEI /embed endpoint."""
        try:
            import httpx  # type: ignore[import]

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{settings.tei_base_url}/embed",
                    json={"inputs": texts, "normalize": True},
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                data = response.json()
                # TEI returns list of list of floats
                if isinstance(data, list) and data and isinstance(data[0], list):
                    return data
                # Single embedding returned as flat list
                if isinstance(data, list) and data and isinstance(data[0], float):
                    return [data]
                return [[0.0] * settings.qdrant_vector_size] * len(texts)
        except Exception as exc:  # noqa: BLE001
            log.error("TEI embedding call failed: %s", exc)
            # Return zero vectors as fallback to avoid blocking ingestion
            return [[0.0] * settings.qdrant_vector_size] * len(texts)
