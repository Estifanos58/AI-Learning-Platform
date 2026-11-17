"""Storage layer – Qdrant vector database client."""

from __future__ import annotations

import hashlib
import logging
from functools import lru_cache
from typing import Any, Dict, List, Optional

log = logging.getLogger(__name__)


class QdrantClient:
    """Thin async wrapper around the Qdrant REST API."""

    def __init__(self, url: str, api_key: Optional[str], collection: str, vector_size: int) -> None:
        self._url = url.rstrip("/")
        self._api_key = api_key
        self._collection = collection
        self._vector_size = vector_size
        self._client: Any = None

    async def _get_client(self) -> Any:
        if self._client is None:
            try:
                from qdrant_client import AsyncQdrantClient  # type: ignore[import]
                self._client = AsyncQdrantClient(
                    url=self._url,
                    api_key=self._api_key,
                    timeout=30,
                )
            except ImportError:
                log.warning("qdrant-client not installed; Qdrant operations will be no-ops")
                self._client = _MockQdrantClient()
        return self._client

    async def ensure_collection(self) -> None:
        client = await self._get_client()
        try:
            from qdrant_client.models import Distance, VectorParams  # type: ignore[import]
            exists = await client.collection_exists(self._collection)
            if not exists:
                await client.create_collection(
                    collection_name=self._collection,
                    vectors_config=VectorParams(
                        size=self._vector_size,
                        distance=Distance.COSINE,
                    ),
                )
                log.info("Created Qdrant collection: %s", self._collection)
        except Exception as exc:  # noqa: BLE001
            log.warning("ensure_collection failed: %s", exc)

    async def ping(self) -> None:
        client = await self._get_client()
        await client.get_collections()

    async def upsert_chunks(self, points: List[Dict[str, Any]]) -> None:
        """Upsert a batch of vector points."""
        client = await self._get_client()
        try:
            from qdrant_client.models import PointStruct  # type: ignore[import]
            structs = [
                PointStruct(id=p["id"], vector=p["vector"], payload=p["payload"])
                for p in points
            ]
            await client.upsert(collection_name=self._collection, points=structs)
        except Exception as exc:  # noqa: BLE001
            log.error("upsert_chunks failed: %s", exc)
            raise

    async def search(
        self,
        query_vector: List[float],
        file_ids: List[str],
        top_k: int = 20,
    ) -> List[Dict[str, Any]]:
        """Semantic search filtered by allowed file IDs."""
        client = await self._get_client()
        try:
            from qdrant_client.models import FieldCondition, Filter, MatchAny  # type: ignore[import]
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="file_id",
                        match=MatchAny(any=file_ids),
                    )
                ]
            )
            results = await client.search(
                collection_name=self._collection,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=top_k,
                with_payload=True,
                with_vectors=False,
            )
            return [
                {"id": str(r.id), "score": r.score, "payload": r.payload}
                for r in results
            ]
        except Exception as exc:  # noqa: BLE001
            log.error("vector search failed: %s", exc)
            raise

    async def delete_by_file_id(self, file_id: str) -> None:
        """Remove all vectors belonging to a file."""
        client = await self._get_client()
        try:
            from qdrant_client.models import FieldCondition, Filter, MatchValue  # type: ignore[import]
            await client.delete(
                collection_name=self._collection,
                points_selector=Filter(
                    must=[FieldCondition(key="file_id", match=MatchValue(value=file_id))]
                ),
            )
            log.info("Deleted vectors for file_id=%s", file_id)
        except Exception as exc:  # noqa: BLE001
            log.error("delete_by_file_id failed: %s", exc)
            raise

    @staticmethod
    def deterministic_point_id(
        file_id: str,
        chunk_index: int,
        extraction_version: str,
        embedding_model_version: str,
    ) -> str:
        """Return a deterministic UUID-like point ID for idempotent upserts."""
        raw = f"{file_id}:{chunk_index}:{extraction_version}:{embedding_model_version}"
        digest = hashlib.sha256(raw.encode()).hexdigest()
        # Format as UUID v4 shape (cosmetic)
        return f"{digest[:8]}-{digest[8:12]}-{digest[12:16]}-{digest[16:20]}-{digest[20:32]}"


class _MockQdrantClient:
    """No-op client used when qdrant-client package is not installed."""

    async def collection_exists(self, *_a: Any, **_kw: Any) -> bool:
        return True

    async def create_collection(self, *_a: Any, **_kw: Any) -> None:
        pass

    async def get_collections(self, *_a: Any, **_kw: Any) -> Any:
        return []

    async def upsert(self, *_a: Any, **_kw: Any) -> None:
        pass

    async def search(self, *_a: Any, **_kw: Any) -> List[Any]:
        return []

    async def delete(self, *_a: Any, **_kw: Any) -> None:
        pass


@lru_cache
def get_qdrant_client() -> QdrantClient:
    from app.config import get_settings
    s = get_settings()
    return QdrantClient(
        url=s.qdrant_url,
        api_key=s.qdrant_api_key,
        collection=s.qdrant_collection,
        vector_size=s.qdrant_vector_size,
    )
