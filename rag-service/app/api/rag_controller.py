"""RAG API controller – HTTP endpoints for ingestion status, retrieval, and management."""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.config import get_settings
from app.ingestion.chunker import RecursiveCharacterTextSplitter
from app.ingestion.embedding_pipeline import EmbeddingPipeline
from app.ingestion.extractor import TextExtractor
from app.ingestion.file_loader import FileLoader
from app.orchestration.pipeline_executor import PipelineExecutor
from app.retrieval.reranker import Reranker
from app.retrieval.vector_search import VectorSearch
from app.security.user_permission_checker import UserPermissionChecker
from app.storage.qdrant_client import get_qdrant_client

router = APIRouter(tags=["rag"])
log = logging.getLogger(__name__)
settings = get_settings()


# ── Request / Response models ─────────────────────────────────────────────────

class IngestRequest(BaseModel):
    file_id: str
    owner_id: str
    user_id: str
    folder_id: Optional[str] = None
    storage_path: str
    content_type: str
    file_name: str = ""
    tags: List[str] = Field(default_factory=list)


class RetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=8000)
    user_id: str
    file_ids: List[str] = Field(default_factory=list)
    top_k: Optional[int] = Field(default=None, ge=1, le=100)


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=8000)
    user_id: str
    file_ids: List[str] = Field(default_factory=list)
    chatroom_id: Optional[str] = None
    model_id: Optional[str] = None
    options: Dict[str, Any] = Field(default_factory=dict)
    context_window: List[Dict[str, Any]] = Field(default_factory=list)


class DeleteRequest(BaseModel):
    file_id: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_file(body: IngestRequest) -> JSONResponse:
    """Manually trigger ingestion for a file (for testing / backfill)."""
    try:
        loader = FileLoader()
        extractor = TextExtractor()
        splitter = RecursiveCharacterTextSplitter()
        pipeline = EmbeddingPipeline()

        content = loader.load(body.storage_path)
        result = extractor.extract(content, body.content_type, body.file_name)
        chunks = splitter.split(result.text)
        count = await pipeline.embed_and_store(
            chunks=chunks,
            file_id=body.file_id,
            owner_id=body.owner_id,
            user_id=body.user_id,
            folder_id=body.folder_id,
            extraction_version=result.extraction_version,
        )
        return JSONResponse(
            {"status": "ok", "file_id": body.file_id, "chunks_stored": count}
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        log.error("Ingestion error: %s", exc)
        raise HTTPException(status_code=500, detail="Ingestion failed")


@router.post("/retrieve")
async def retrieve_chunks(body: RetrieveRequest) -> JSONResponse:
    """Retrieve relevant chunks for a query (authorized file IDs only)."""
    perm = UserPermissionChecker()
    allowed = await perm.get_allowed_file_ids(body.user_id, body.file_ids)

    searcher = VectorSearch()
    raw = await searcher.search(body.query, allowed, top_k=body.top_k)
    reranker = Reranker()
    final = await reranker.rerank(body.query, raw)

    return JSONResponse(
        {
            "query": body.query,
            "chunk_count": len(final),
            "chunks": [
                {
                    "score": c.get("score"),
                    "file_id": c.get("payload", {}).get("file_id"),
                    "page_number": c.get("payload", {}).get("page_number"),
                    "chunk_text_preview": c.get("payload", {}).get("chunk_text", "")[:300],
                }
                for c in final
            ],
        }
    )


@router.delete("/vectors/{file_id}", status_code=status.HTTP_200_OK)
async def delete_file_vectors(file_id: str) -> JSONResponse:
    """Remove all vectors for a given file (called after file deletion event)."""
    try:
        await get_qdrant_client().delete_by_file_id(file_id)
        return JSONResponse({"status": "ok", "file_id": file_id})
    except Exception as exc:  # noqa: BLE001
        log.error("Vector deletion error: %s", exc)
        raise HTTPException(status_code=500, detail="Vector deletion failed")


@router.post("/cancel/{request_id}", status_code=status.HTTP_200_OK)
async def cancel_generation(request_id: str) -> JSONResponse:
    """Cancel an in-flight generation pipeline."""
    PipelineExecutor.cancel(request_id)
    return JSONResponse({"status": "cancellation_requested", "request_id": request_id})


@router.get("/providers")
async def list_providers() -> JSONResponse:
    """Return available LLM providers."""
    from app.llm.provider_router import ProviderRouter
    router_inst = ProviderRouter()
    return JSONResponse({"available_providers": router_inst.available_providers()})


@router.get("/collection/info")
async def collection_info() -> JSONResponse:
    """Return Qdrant collection stats."""
    try:
        client = get_qdrant_client()
        raw_client = await client._get_client()
        info = await raw_client.get_collection(settings.qdrant_collection)
        return JSONResponse(
            {
                "collection": settings.qdrant_collection,
                "vectors_count": getattr(info, "vectors_count", None),
                "status": str(getattr(info, "status", "unknown")),
            }
        )
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"collection": settings.qdrant_collection, "error": str(exc)})
