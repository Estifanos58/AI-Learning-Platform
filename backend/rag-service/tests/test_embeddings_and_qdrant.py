"""Tests for EmbeddingPipeline, QueryEmbedder, and QdrantClient validation (no zero-vector fallbacks)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest

from app.config import get_settings
from app.ingestion.chunker import TextChunk
from app.ingestion.embedding_pipeline import EmbeddingError, EmbeddingPipeline, validate_embedding_vector
from app.retrieval.query_embedder import QueryEmbedder
from app.storage.qdrant_client import QdrantClient, QdrantValidationError


def test_validate_embedding_vector_rejects_zero_nan_and_wrong_dim():
    with pytest.raises(EmbeddingError, match="zero vector"):
        validate_embedding_vector([0.0, 0.0, 0.0], expected_dim=3)

    with pytest.raises(EmbeddingError, match="NaN or Inf"):
        validate_embedding_vector([1.0, float("nan"), 0.5], expected_dim=3)

    with pytest.raises(EmbeddingError, match="dimension mismatch"):
        validate_embedding_vector([0.5, 0.5], expected_dim=3)

    valid = validate_embedding_vector([0.6, 0.8, 0.0], expected_dim=3)
    assert valid == [0.6, 0.8, 0.0]


@pytest.mark.asyncio
async def test_embedding_pipeline_fails_explicitly_when_tei_fails(monkeypatch):
    monkeypatch.setenv("QDRANT_VECTOR_SIZE", "3")
    get_settings.cache_clear()

    async def failing_post(*_args, **_kwargs):
        raise httpx.ConnectError("TEI unreachable")

    monkeypatch.setattr(httpx.AsyncClient, "post", failing_post)

    qdrant = AsyncMock()
    pipeline = EmbeddingPipeline(qdrant_client=qdrant)
    chunks = [TextChunk(index=0, text="hello", char_start=0, char_end=5)]

    with pytest.raises(EmbeddingError) as exc_info:
        await pipeline.embed_and_store(
            chunks=chunks,
            file_id="file-1",
            owner_id="user-1",
            user_id="user-1",
            folder_id=None,
            extraction_version="2",
        )
    assert exc_info.value.retryable is True
    qdrant.upsert_chunks.assert_not_called()


@pytest.mark.asyncio
async def test_embedding_pipeline_rejects_dimension_mismatch_from_tei(monkeypatch):
    monkeypatch.setenv("QDRANT_VECTOR_SIZE", "4")
    get_settings.cache_clear()

    async def bad_dim_post(*_args, **_kwargs):
        return httpx.Response(
            status_code=200,
            json=[[0.1, 0.2]],  # wrong dimension (2 instead of 4)
            request=httpx.Request("POST", "http://tei/embed"),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", bad_dim_post)

    qdrant = AsyncMock()
    pipeline = EmbeddingPipeline(qdrant_client=qdrant)
    chunks = [TextChunk(index=0, text="hello", char_start=0, char_end=5)]

    with pytest.raises(EmbeddingError, match="dimension mismatch"):
        await pipeline.embed_and_store(
            chunks=chunks,
            file_id="file-1",
            owner_id="user-1",
            user_id="user-1",
            folder_id=None,
            extraction_version="2",
        )
    qdrant.upsert_chunks.assert_not_called()


@pytest.mark.asyncio
async def test_query_embedder_raises_instead_of_returning_zero_vector(monkeypatch):
    monkeypatch.setenv("QDRANT_VECTOR_SIZE", "3")
    get_settings.cache_clear()

    async def failing_post(*_args, **_kwargs):
        return httpx.Response(
            status_code=503,
            text="Service Unavailable",
            request=httpx.Request("POST", "http://tei/embed"),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", failing_post)

    with pytest.raises(EmbeddingError) as exc_info:
        await QueryEmbedder().embed("What is Raft?")
    assert exc_info.value.retryable is True


@pytest.mark.asyncio
async def test_qdrant_client_validates_collection_vector_size_and_upsert_dims():
    client = QdrantClient(url="http://qdrant:6333", api_key="secret", collection="test_col", vector_size=4)
    fake_raw = AsyncMock()
    fake_raw.collection_exists.return_value = True
    fake_raw.get_collection.return_value = SimpleNamespace(
        config=SimpleNamespace(params=SimpleNamespace(vectors=SimpleNamespace(size=768)))
    )
    client._client = fake_raw

    with pytest.raises(QdrantValidationError, match="vector size mismatch"):
        await client.ensure_collection()

    with pytest.raises(QdrantValidationError, match="invalid vector size"):
        await client.upsert_chunks([{"id": "1", "vector": [0.1, 0.2], "payload": {}}])

    with pytest.raises(QdrantValidationError, match="dimension mismatch"):
        await client.search([0.1, 0.2], file_ids=["f1"])
