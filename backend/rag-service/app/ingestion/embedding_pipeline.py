"""Ingestion – embedding pipeline (TEI + Qdrant upsert) with strict validation."""

from __future__ import annotations

import logging
import math
import time
import uuid
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.ingestion.chunker import TextChunk
from app.observability import (
    EMBEDDING_LATENCY_SECONDS,
    EMBEDDING_REQUESTS_TOTAL,
    get_correlation_id,
)
from app.storage.models import ChunkPayload
from app.storage.qdrant_client import QdrantClient, get_qdrant_client

log = logging.getLogger(__name__)


class EmbeddingError(RuntimeError):
    """Retryable error raised when embedding generation or validation fails."""

    def __init__(self, message: str, *, retryable: bool = True) -> None:
        super().__init__(message)
        self.retryable = retryable


def get_embedding_model_version() -> str:
    settings = get_settings()
    model_slug = settings.tei_model.split("/")[-1].strip() or "unknown-model"
    return f"{model_slug}-v1"


# Preserved module-level constant for backward compatibility
EMBEDDING_MODEL_VERSION = get_embedding_model_version()


def validate_embedding_vector(vector: Any, expected_dim: int) -> List[float]:
    if not isinstance(vector, list) or len(vector) != expected_dim:
        actual = len(vector) if isinstance(vector, list) else type(vector).__name__
        raise EmbeddingError(
            f"Embedding vector dimension mismatch: expected {expected_dim}, got {actual}",
            retryable=False,
        )

    cleaned: List[float] = []
    norm_sq = 0.0
    for value in vector:
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise EmbeddingError("Embedding vector contains non-numeric value", retryable=False)
        fval = float(value)
        if not math.isfinite(fval):
            raise EmbeddingError("Embedding vector contains NaN or Inf value", retryable=False)
        cleaned.append(fval)
        norm_sq += fval * fval

    if norm_sq <= 1e-12:
        raise EmbeddingError("Embedding vector is an invalid zero vector", retryable=True)

    return cleaned


class EmbeddingPipeline:
    """
    Embeds text chunks via Hugging Face TEI and upserts to Qdrant.
    Never substitutes zero vectors on failure.
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
        document_name: str = "",
        index_version: Optional[str] = None,
    ) -> int:
        """Embed chunks and atomically upsert to Qdrant with versioned cleanup."""
        if not chunks:
            return 0

        texts = [c.text for c in chunks]
        vectors = await self._embed(texts)
        if len(vectors) != len(chunks):
            raise EmbeddingError(
                f"Embedding count mismatch: expected {len(chunks)} vectors, got {len(vectors)}",
                retryable=True,
            )

        model_version = get_embedding_model_version()
        idx_version = index_version or f"v_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        points: List[Dict[str, Any]] = []
        for chunk, vector in zip(chunks, vectors, strict=True):
            point_id = self._qdrant.deterministic_point_id(
                file_id=file_id,
                chunk_index=chunk.index,
                extraction_version=extraction_version,
                embedding_model_version=model_version,
                index_version=idx_version,
            )
            payload = ChunkPayload(
                chunk_id=point_id,
                file_id=file_id,
                owner_id=owner_id,
                user_id=user_id,
                folder_id=folder_id,
                page_number=chunk.page_number,
                slide_number=chunk.slide_number,
                sheet_name=chunk.sheet_name,
                section=chunk.section,
                char_start=chunk.char_start,
                char_end=chunk.char_end,
                token_count=chunk.token_count,
                document_name=document_name,
                index_version=idx_version,
                chunk_index=chunk.index,
                chunk_text=chunk.text,
                embedding_model=model_version,
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
            "Stored %d vectors for file_id=%s (index_version=%s)",
            len(points),
            file_id,
            idx_version,
        )

        # Post-upsert version cleanup: safely delete stale vectors from older index versions
        try:
            if hasattr(self._qdrant, "delete_old_versions"):
                await self._qdrant.delete_old_versions(
                    file_id=file_id,
                    keep_index_version=idx_version,
                )
        except Exception as exc:
            log.warning("Post-ingestion stale version cleanup failed for file_id=%s: %s", file_id, exc)

        return len(points)

    async def _embed(self, texts: List[str]) -> List[List[float]]:
        """Batch embed texts using HF TEI endpoint."""
        settings = get_settings()
        all_embeddings: List[List[float]] = []
        batch_size = max(1, settings.embedding_batch_size)

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            embeddings = await self._call_tei(batch)
            all_embeddings.extend(embeddings)

        return all_embeddings

    async def _call_tei(self, texts: List[str]) -> List[List[float]]:
        """Call HF TEI /embed endpoint and strictly validate all returned vectors."""
        import httpx

        settings = get_settings()
        headers = {"Content-Type": "application/json"}
        corr_id = get_correlation_id()
        if corr_id:
            headers["X-Correlation-ID"] = corr_id

        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{settings.tei_base_url.rstrip('/')}/embed",
                    json={"inputs": texts, "normalize": True},
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()

            if isinstance(data, list) and data and isinstance(data[0], list):
                raw_vectors = data
            elif isinstance(data, list) and data and isinstance(data[0], (int, float)) and len(texts) == 1:
                raw_vectors = [data]
            else:
                raise EmbeddingError(
                    f"Unexpected TEI response structure: {type(data).__name__}",
                    retryable=True,
                )

            if len(raw_vectors) != len(texts):
                raise EmbeddingError(
                    f"TEI returned {len(raw_vectors)} embeddings for {len(texts)} inputs",
                    retryable=True,
                )

            validated = [
                validate_embedding_vector(vec, settings.qdrant_vector_size)
                for vec in raw_vectors
            ]
            EMBEDDING_REQUESTS_TOTAL.labels(operation="ingest", status="success").inc()
            EMBEDDING_LATENCY_SECONDS.labels(operation="ingest").observe(time.monotonic() - start)
            return validated
        except EmbeddingError:
            EMBEDDING_REQUESTS_TOTAL.labels(operation="ingest", status="error").inc()
            raise
        except httpx.HTTPStatusError as exc:
            EMBEDDING_REQUESTS_TOTAL.labels(operation="ingest", status="error").inc()
            status = exc.response.status_code
            retryable = status == 429 or status >= 500
            log.error("TEI HTTP error status=%d: %s", status, exc)
            raise EmbeddingError(f"TEI embedding request failed with HTTP {status}", retryable=retryable) from exc
        except Exception as exc:
            EMBEDDING_REQUESTS_TOTAL.labels(operation="ingest", status="error").inc()
            log.error("TEI embedding call failed: %s", exc)
            raise EmbeddingError(f"TEI embedding call failed: {exc}", retryable=True) from exc
