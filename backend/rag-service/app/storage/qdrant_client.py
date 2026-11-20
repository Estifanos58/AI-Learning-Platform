"""Storage layer – Qdrant vector database client with strict validation."""

from __future__ import annotations

import hashlib
import logging
from functools import lru_cache
from typing import Any, Dict, List, Optional

log = logging.getLogger(__name__)


class QdrantValidationError(RuntimeError):
    """Raised when Qdrant schema or vector payloads violate invariants."""


class QdrantClient:
    """Async wrapper around the Qdrant API with strict schema and vector validation."""

    def __init__(self, url: str, api_key: Optional[str], collection: str, vector_size: int) -> None:
        self._url = url.rstrip("/")
        self._api_key = api_key or None
        self._collection = collection
        self._vector_size = vector_size
        self._client: Any = None

    async def _get_client(self) -> Any:
        if self._client is None:
            try:
                from qdrant_client import AsyncQdrantClient  # type: ignore[import]
            except ImportError as exc:
                raise RuntimeError("qdrant-client package is required and must be installed") from exc

            self._client = AsyncQdrantClient(
                url=self._url,
                api_key=self._api_key,
                timeout=30,
            )
        return self._client

    async def ensure_collection(self) -> None:
        """Create the collection if missing, or verify existing vector dimensions match configuration."""
        client = await self._get_client()
        from qdrant_client.models import Distance, PayloadSchemaType, VectorParams  # type: ignore[import]

        exists = await client.collection_exists(self._collection)
        if not exists:
            await client.create_collection(
                collection_name=self._collection,
                vectors_config=VectorParams(
                    size=self._vector_size,
                    distance=Distance.COSINE,
                ),
            )
            log.info("Created Qdrant collection: %s (size=%d)", self._collection, self._vector_size)
        else:
            info = await client.get_collection(self._collection)
            configured_size = self._extract_vector_size(info)
            if configured_size is not None and configured_size != self._vector_size:
                raise QdrantValidationError(
                    f"Qdrant collection '{self._collection}' vector size mismatch: "
                    f"collection has {configured_size}, expected {self._vector_size}"
                )

        try:
            await client.create_payload_index(
                collection_name=self._collection,
                field_name="file_id",
                field_schema=PayloadSchemaType.KEYWORD,
            )
            await client.create_payload_index(
                collection_name=self._collection,
                field_name="index_version",
                field_schema=PayloadSchemaType.KEYWORD,
            )
            await client.create_payload_index(
                collection_name=self._collection,
                field_name="owner_id",
                field_schema=PayloadSchemaType.KEYWORD,
            )
        except Exception as exc:
            log.debug("Payload index creation skipped/already exists: %s", exc)

    def _extract_vector_size(self, collection_info: Any) -> Optional[int]:
        try:
            vectors = collection_info.config.params.vectors
            if hasattr(vectors, "size"):
                return int(vectors.size)
            if isinstance(vectors, dict) and vectors:
                first = next(iter(vectors.values()))
                if hasattr(first, "size"):
                    return int(first.size)
        except Exception:
            return None
        return None

    async def get_collection_info(self) -> Any:
        client = await self._get_client()
        return await client.get_collection(self._collection)

    async def ping(self) -> None:
        client = await self._get_client()
        await client.get_collections()

    async def upsert_chunks(self, points: List[Dict[str, Any]]) -> None:
        """Validate dimensions and upsert a batch of vector points."""
        if not points:
            return
        for idx, point in enumerate(points):
            vec = point.get("vector")
            if not isinstance(vec, list) or len(vec) != self._vector_size:
                raise QdrantValidationError(
                    f"Point index {idx} has invalid vector size: expected {self._vector_size}, "
                    f"got {len(vec) if isinstance(vec, list) else type(vec).__name__}"
                )

        client = await self._get_client()
        try:
            from qdrant_client.models import PointStruct  # type: ignore[import]

            structs = [
                PointStruct(id=p["id"], vector=p["vector"], payload=p["payload"])
                for p in points
            ]
            await client.upsert(collection_name=self._collection, points=structs, wait=True)
        except Exception as exc:
            log.error("upsert_chunks failed: %s", exc)
            raise

    async def search(
        self,
        query_vector: List[float],
        file_ids: List[str],
        top_k: int = 20,
    ) -> List[Dict[str, Any]]:
        """Semantic search filtered by allowed file IDs."""
        if not file_ids:
            return []
        if not isinstance(query_vector, list) or len(query_vector) != self._vector_size:
            raise QdrantValidationError(
                f"Query vector dimension mismatch: expected {self._vector_size}, "
                f"got {len(query_vector) if isinstance(query_vector, list) else type(query_vector).__name__}"
            )

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
        except Exception as exc:
            log.error("vector search failed: %s", exc)
            raise

    async def scroll_chunks(
        self,
        file_ids: List[str],
        limit: int = 200,
    ) -> List[Dict[str, Any]]:
        """Scroll chunks belonging to allowed file IDs for BM25 lexical ranking."""
        if not file_ids:
            return []
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
            records, _ = await client.scroll(
                collection_name=self._collection,
                scroll_filter=query_filter,
                limit=limit,
                with_payload=True,
                with_vectors=False,
            )
            return [
                {"id": str(r.id), "score": 0.0, "payload": r.payload}
                for r in records
            ]
        except Exception as exc:
            log.warning("scroll_chunks failed: %s", exc)
            return []

    async def delete_by_file_id(self, file_id: str) -> None:
        """Remove all vectors belonging to a file."""
        if not file_id or not file_id.strip():
            raise QdrantValidationError("file_id is required for deletion")
        client = await self._get_client()
        try:
            from qdrant_client.models import FieldCondition, Filter, MatchValue  # type: ignore[import]

            await client.delete(
                collection_name=self._collection,
                points_selector=Filter(
                    must=[FieldCondition(key="file_id", match=MatchValue(value=file_id))]
                ),
                wait=True,
            )
            log.info("Deleted vectors for file_id=%s", file_id)
        except Exception as exc:
            log.error("delete_by_file_id failed: %s", exc)
            raise

    async def delete_old_versions(self, file_id: str, keep_index_version: str) -> None:
        """Remove older index versions for a file after successful re-ingestion."""
        if not file_id or not file_id.strip() or not keep_index_version:
            return
        client = await self._get_client()
        try:
            from qdrant_client.models import FieldCondition, Filter, MatchValue  # type: ignore[import]

            selector = Filter(
                must=[FieldCondition(key="file_id", match=MatchValue(value=file_id))],
                must_not=[FieldCondition(key="index_version", match=MatchValue(value=keep_index_version))],
            )
            await client.delete(
                collection_name=self._collection,
                points_selector=selector,
                wait=True,
            )
            log.info(
                "Deleted older index versions for file_id=%s retaining keep_version=%s",
                file_id,
                keep_index_version,
            )
        except Exception as exc:
            log.warning("delete_old_versions failed: %s", exc)

    @staticmethod
    def deterministic_point_id(
        file_id: str,
        chunk_index: int,
        extraction_version: str,
        embedding_model_version: str,
        index_version: str = "",
    ) -> str:
        """Return a deterministic UUID-like point ID for idempotent upserts."""
        raw = f"{file_id}:{chunk_index}:{extraction_version}:{embedding_model_version}"
        if index_version:
            raw = f"{raw}:{index_version}"
        digest = hashlib.sha256(raw.encode()).hexdigest()
        return f"{digest[:8]}-{digest[8:12]}-{digest[12:16]}-{digest[16:20]}-{digest[20:32]}"


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
