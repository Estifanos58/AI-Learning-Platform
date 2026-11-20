"""
RAG Service – Application Entry Point.

Wires together:
  - FastAPI application with lifespan (startup / shutdown)
  - Structured JSON logging & correlation ID middleware
  - Kafka consumer & producer workers (ingestion + AI request + cancellation + DLT)
  - Liveness (/health), Readiness (/ready), and Prometheus Metrics (/metrics) endpoints
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

import httpx
import redis.asyncio as aioredis
import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.config import get_settings
from app.db.session import init_database, ping_database
from app.grpc.ai_models_server import AiModelsGrpcServer
from app.ingestion.kafka_consumer import IngestionConsumer
from app.llm.model_bootstrap import bootstrap_default_models
from app.observability import (
    configure_structured_logging,
    get_correlation_id,
    reset_correlation_id,
    set_correlation_id,
)
from app.storage.qdrant_client import get_qdrant_client
from app.streaming.response_streamer import get_producer
from app.workers.direct_execution_runtime import get_direct_execution_worker
from app.workers.quota_reset_worker import QuotaResetWorker

settings = get_settings()

configure_structured_logging(level=settings.log_level, service_name=settings.service_name)
log = logging.getLogger("rag-service")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info(
        "Starting %s v%s [%s]",
        settings.service_name,
        settings.service_version,
        settings.environment,
    )
    strict_startup = settings.environment not in {"development", "test"}

    # Ensure Qdrant collection exists and matches configured vector dimensions
    try:
        qdrant = get_qdrant_client()
        await qdrant.ensure_collection()
        log.info("Qdrant collection ready: %s", settings.qdrant_collection)
    except Exception as exc:  # noqa: BLE001
        log.error("Qdrant initialization failed: %s", exc)
        if strict_startup:
            raise

    # Verify DB connectivity & Alembic migration version
    try:
        await init_database()
        log.info("RAG PostgreSQL connection and migrations verified")
        await bootstrap_default_models()
    except Exception as exc:  # noqa: BLE001
        log.error("RAG database verification failed: %s", exc)
        if strict_startup:
            raise

    # Start Kafka producer (required for streaming and DLT publishing)
    producer = None
    if settings.stream_backend.lower() in {"kafka", "dual"} or settings.kafka_consumer_enabled:
        try:
            producer = get_producer()
            producer.start()
            log.info("Kafka producer started")
        except Exception as exc:  # noqa: BLE001
            log.error("Kafka producer failed to start: %s", exc)
            if strict_startup:
                raise

    # Start gRPC server
    grpc_server = None
    try:
        grpc_server = AiModelsGrpcServer()
        await grpc_server.start()
    except Exception as exc:  # noqa: BLE001
        log.error("RAG gRPC server failed to start: %s", exc)
        raise

    quota_worker = QuotaResetWorker()
    direct_execution_worker = get_direct_execution_worker()
    quota_worker.start()
    direct_execution_worker.start()

    # Start Kafka consumer worker
    consumer: IngestionConsumer | None = None
    if settings.kafka_consumer_enabled:
        consumer = IngestionConsumer(asyncio.get_running_loop())
        consumer.start()
        log.info("Kafka ingestion consumer started")

    app.state.kafka_consumer = consumer
    app.state.kafka_producer = producer
    app.state.grpc_server = grpc_server
    app.state.direct_execution_worker = direct_execution_worker

    yield

    log.info("Shutting down %s", settings.service_name)
    if consumer:
        consumer.stop()
    if producer:
        producer.stop()
    if grpc_server:
        await grpc_server.stop()
    await direct_execution_worker.stop()
    await quota_worker.stop()


app = FastAPI(
    title="RAG Service",
    description=(
        "Retrieval-Augmented Generation service for the AI Learning Platform. "
        "Handles document extraction, vector storage, multi-agent orchestration, "
        "and streaming AI responses."
    ),
    version=settings.service_version,
    lifespan=lifespan,
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url="/redoc" if settings.environment == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"] if settings.environment == "development" else [],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Correlation-ID"],
)


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    incoming = request.headers.get("x-correlation-id") or request.headers.get("x-request-id")
    token = set_correlation_id(incoming)
    try:
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = get_correlation_id()
        return response
    finally:
        reset_correlation_id(token)


@app.get("/health", tags=["ops"])
async def health() -> JSONResponse:
    """Liveness probe — confirms the process event loop and critical background worker are alive."""
    worker = getattr(app.state, "direct_execution_worker", None)
    if worker is not None and not worker.is_running:
        return JSONResponse(
            {"status": "unhealthy", "service": settings.service_name, "reason": "execution worker stopped"},
            status_code=503,
        )
    return JSONResponse({"status": "ok", "service": settings.service_name})


@app.get("/ready", tags=["ops"])
async def readiness() -> JSONResponse:
    """Readiness probe — checks PostgreSQL, Qdrant, Redis, TEI, Kafka consumer, and execution worker."""
    checks: dict[str, str] = {}
    overall = "ok"

    # 1. PostgreSQL
    try:
        await ping_database()
        checks["database"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["database"] = f"error: {exc}"
        overall = "degraded"

    # 2. Qdrant
    try:
        qdrant = get_qdrant_client()
        await qdrant.ping()
        checks["qdrant"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["qdrant"] = f"error: {exc}"
        overall = "degraded"

    # 3. Redis (when redis/dual stream backend enabled)
    if settings.stream_backend.lower() in {"redis", "dual"}:
        client = None
        try:
            client = aioredis.from_url(settings.redis_url, socket_connect_timeout=3, socket_timeout=3)
            await client.ping()
            checks["redis"] = "ok"
        except Exception as exc:  # noqa: BLE001
            checks["redis"] = f"error: {exc}"
            overall = "degraded"
        finally:
            if client is not None:
                await client.aclose()

    # 4. TEI embeddings endpoint
    try:
        async with httpx.AsyncClient(timeout=3.0) as http_client:
            resp = await http_client.get(f"{settings.tei_base_url.rstrip('/')}/health")
            if resp.status_code < 400:
                checks["tei"] = "ok"
            else:
                checks["tei"] = f"error: status {resp.status_code}"
                overall = "degraded"
    except Exception as exc:  # noqa: BLE001
        checks["tei"] = f"error: {exc}"
        overall = "degraded"

    # 5. Kafka consumer
    if settings.kafka_consumer_enabled:
        consumer = getattr(app.state, "kafka_consumer", None)
        if consumer is not None and consumer.is_connected:
            checks["kafka_consumer"] = "ok"
        else:
            checks["kafka_consumer"] = "error: consumer not connected"
            overall = "degraded"

    # 6. DirectExecutionWorker
    worker = getattr(app.state, "direct_execution_worker", None)
    if worker is not None and worker.is_running:
        checks["execution_worker"] = "ok"
    else:
        checks["execution_worker"] = "error: worker not running"
        overall = "degraded"

    return JSONResponse(
        {"status": overall, "service": settings.service_name, "checks": checks},
        status_code=200 if overall == "ok" else 503,
    )


@app.get("/metrics", tags=["ops"])
async def metrics() -> Response:
    """Prometheus operational metrics endpoint."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        workers=settings.workers,
        log_level=settings.log_level.lower(),
        reload=settings.environment == "development",
    )
