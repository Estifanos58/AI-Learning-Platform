from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.config import get_settings
from app.email.sender import EmailSender
from app.handlers.verification_handler import VerificationHandler
from app.kafka.consumer import VerificationConsumer
from app.observability import (
    configure_structured_logging,
    get_correlation_id,
    reset_correlation_id,
    set_correlation_id,
)
from app.utils.idempotency import create_idempotency_store

settings = get_settings()
configure_structured_logging(level=settings.log_level, service_name=settings.service_name)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    email_sender = EmailSender(settings)
    verification_handler = VerificationHandler(email_sender)
    idempotency_store = create_idempotency_store(settings)

    try:
        idempotency_store.ping()
    except Exception as exc:
        logger.exception('Idempotency store unavailable during startup: %s', exc)
        raise RuntimeError('Failed to connect to persistent idempotency store') from exc

    consumer = None
    try:
        consumer = VerificationConsumer(settings, verification_handler, idempotency_store)
        consumer.start()
        app.state.verification_consumer = consumer
        app.state.idempotency_store = idempotency_store
        logger.info('Notification service started with persistent deduplication (%s)', settings.idempotency_backend)
    except Exception as exc:
        idempotency_store.close()
        logger.exception('Kafka consumer failed to start; startup aborted: %s', exc)
        raise RuntimeError('Failed to initialize Kafka verification consumer') from exc

    yield

    if consumer is not None:
        consumer.stop()
    idempotency_store.close()


app = FastAPI(title='Notification Service', version='1.0.0', lifespan=lifespan)


@app.middleware('http')
async def correlation_id_middleware(request: Request, call_next):
    incoming = request.headers.get('x-correlation-id') or request.headers.get('x-request-id')
    token = set_correlation_id(incoming)
    try:
        response = await call_next(request)
        response.headers['X-Correlation-ID'] = get_correlation_id()
        return response
    finally:
        reset_correlation_id(token)


@app.get('/health')
def health() -> JSONResponse:
    consumer = getattr(app.state, 'verification_consumer', None)
    if consumer is not None and not consumer.is_alive:
        return JSONResponse(
            {'status': 'unhealthy', 'service': settings.service_name, 'reason': 'consumer thread stopped'},
            status_code=503,
        )
    return JSONResponse({'status': 'ok', 'service': settings.service_name})


@app.get('/ready')
def readiness() -> JSONResponse:
    checks: dict[str, str] = {}
    overall = 'ok'

    store = getattr(app.state, 'idempotency_store', None)
    if store is None:
        checks['idempotency_store'] = 'error: not initialized'
        overall = 'degraded'
    else:
        try:
            store.ping()
            checks['idempotency_store'] = 'ok'
        except Exception as exc:  # noqa: BLE001
            checks['idempotency_store'] = f'error: {exc}'
            overall = 'degraded'

    consumer = getattr(app.state, 'verification_consumer', None)
    if consumer is not None and consumer.is_connected:
        checks['kafka_consumer'] = 'ok'
    else:
        checks['kafka_consumer'] = 'error: consumer not connected'
        overall = 'degraded'

    return JSONResponse(
        {'status': overall, 'service': settings.service_name, 'checks': checks},
        status_code=200 if overall == 'ok' else 503,
    )


@app.get('/metrics')
def metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
