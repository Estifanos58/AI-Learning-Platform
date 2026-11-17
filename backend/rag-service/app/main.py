"""
RAG Service – Application Entry Point.

Wires together:
  • FastAPI application with lifespan (startup / shutdown)
  • Structured JSON logging
  • Kafka consumer workers (ingestion + AI request + cancellation)
  • Health / metrics endpoints
  • API router
"""

from __future__ import annotations

import logging
import sys
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db.session import init_database
from app.grpc.ai_models_server import AiModelsGrpcServer
from app.ingestion.kafka_consumer import IngestionConsumer
from app.storage.qdrant_client import get_qdrant_client
from app.streaming.response_streamer import get_producer
from app.workers.direct_execution_runtime import get_direct_execution_worker
from app.workers.quota_reset_worker import QuotaResetWorker

settings = get_settings()


# ── Logging ──────────────────────────────────────────────────────────────────
def _configure_logging() -> None:
    logging.basicConfig(
        stream=sys.stdout,
        level=settings.log_level.upper(),
        format=(
            '{"time":"%(asctime)s","level":"%(levelname)s",'
            '"service":"%(name)s","message":"%(message)s"}'
        ),
    )


_configure_logging()
log = logging.getLogger("rag-service")


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info(
        "Starting %s v%s [%s]",
        settings.service_name,
        settings.service_version,
        settings.environment,
    )

    # Ensure Qdrant collection exists
    try:
        qdrant = get_qdrant_client()
        await qdrant.ensure_collection()
        log.info("Qdrant collection ready: %s", settings.qdrant_collection)
    except Exception as exc:  # noqa: BLE001
        log.warning("Qdrant not available at startup: %s", exc)

    try:
        await init_database()
        log.info("RAG PostgreSQL tables ready")
    except Exception as exc:  # noqa: BLE001
        log.warning("RAG database init failed at startup: %s", exc)

    # Start Kafka producer
    producer = None
    grpc_server = None
    quota_worker = QuotaResetWorker()
    direct_execution_worker = get_direct_execution_worker()
    if settings.stream_backend.lower() in {"kafka", "dual"}:
        try:
            producer = get_producer()
            producer.start()
            log.info("Kafka producer started")
        except Exception as exc:  # noqa: BLE001
            log.warning("Kafka producer failed to start: %s", exc)

    try:
        grpc_server = AiModelsGrpcServer()
        await grpc_server.start()
    except Exception as exc:  # noqa: BLE001
        log.warning("RAG gRPC server failed to start: %s", exc)

    quota_worker.start()
    direct_execution_worker.start()

    # Start Kafka consumer workers (background threads)
    consumer: IngestionConsumer | None = None
    if settings.kafka_consumer_enabled:
        try:
            consumer = IngestionConsumer(asyncio.get_running_loop())
            consumer.start()
            log.info("Kafka ingestion consumer started")
        except Exception as exc:  # noqa: BLE001
            log.warning("Kafka consumer failed to start: %s", exc)

    yield  # ← application is running

    # Shutdown
    log.info("Shutting down %s", settings.service_name)
    if consumer:
        consumer.stop()
    if producer:
        producer.stop()
    if grpc_server:
        await grpc_server.stop()
    await direct_execution_worker.stop()
    await quota_worker.stop()


# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="RAG Service",
    description=(
        "Enterprise-grade Retrieval-Augmented Generation service for the "
        "AI Learning Platform. Handles file ingestion, vector storage, "
        "multi-agent orchestration, and streaming AI responses."
    ),
    version=settings.service_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────


@app.get("/health", tags=["ops"])
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "service": settings.service_name})


@app.get("/ready", tags=["ops"])
async def readiness() -> JSONResponse:
    """Kubernetes readiness probe – checks critical dependencies."""
    checks: dict[str, str] = {}
    overall = "ok"

    try:
        qdrant = get_qdrant_client()
        await qdrant.ping()
        checks["qdrant"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["qdrant"] = f"error: {exc}"
        overall = "degraded"

    return JSONResponse(
        {"status": overall, "checks": checks},
        status_code=200 if overall == "ok" else 503,
    )


# ── Dev entrypoint ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        workers=settings.workers,
        log_level=settings.log_level.lower(),
        reload=settings.environment == "development",
    )
