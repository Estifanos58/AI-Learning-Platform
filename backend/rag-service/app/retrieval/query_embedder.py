"""Retrieval – encode a user query into a validated embedding vector."""

from __future__ import annotations

import logging
import time
from typing import List

from app.config import get_settings
from app.ingestion.embedding_pipeline import EmbeddingError, validate_embedding_vector
from app.observability import (
    EMBEDDING_LATENCY_SECONDS,
    EMBEDDING_REQUESTS_TOTAL,
    get_correlation_id,
)

log = logging.getLogger(__name__)


class QueryEmbedder:
    """Embeds a user query using the same TEI endpoint used during ingestion. Never returns zero vectors."""

    async def embed(self, query: str) -> List[float]:
        """Return a validated embedding vector for `query`."""
        import httpx

        if not query or not query.strip():
            raise EmbeddingError("Query text must not be empty", retryable=False)

        settings = get_settings()
        headers = {"Content-Type": "application/json"}
        corr_id = get_correlation_id()
        if corr_id:
            headers["X-Correlation-ID"] = corr_id

        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.tei_base_url.rstrip('/')}/embed",
                    json={"inputs": query, "normalize": True},
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()

            if isinstance(data, list) and data and isinstance(data[0], list):
                raw_vec = data[0]
            elif isinstance(data, list) and data and isinstance(data[0], (int, float)):
                raw_vec = data
            else:
                raise EmbeddingError(
                    f"Unexpected TEI query embedding response: {type(data).__name__}",
                    retryable=True,
                )

            validated = validate_embedding_vector(raw_vec, settings.qdrant_vector_size)
            EMBEDDING_REQUESTS_TOTAL.labels(operation="query", status="success").inc()
            EMBEDDING_LATENCY_SECONDS.labels(operation="query").observe(time.monotonic() - start)
            return validated
        except EmbeddingError:
            EMBEDDING_REQUESTS_TOTAL.labels(operation="query", status="error").inc()
            raise
        except httpx.HTTPStatusError as exc:
            EMBEDDING_REQUESTS_TOTAL.labels(operation="query", status="error").inc()
            status = exc.response.status_code
            retryable = status == 429 or status >= 500
            log.error("TEI query embedding HTTP error status=%d: %s", status, exc)
            raise EmbeddingError(f"Query embedding failed with HTTP {status}", retryable=retryable) from exc
        except Exception as exc:
            EMBEDDING_REQUESTS_TOTAL.labels(operation="query", status="error").inc()
            log.error("Query embedding failed: %s", exc)
            raise EmbeddingError(f"Query embedding failed: {exc}", retryable=True) from exc
