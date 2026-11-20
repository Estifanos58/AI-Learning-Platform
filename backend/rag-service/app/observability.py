"""Structured JSON logging, correlation context propagation, and Prometheus metrics for rag-service."""

from __future__ import annotations

import contextvars
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from prometheus_client import Counter, Gauge, Histogram

_correlation_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default=""
)


def get_correlation_id() -> str:
    return _correlation_id_var.get()


def set_correlation_id(correlation_id: str | None) -> contextvars.Token[str]:
    value = (correlation_id or "").strip() or str(uuid.uuid4())
    return _correlation_id_var.set(value)


def reset_correlation_id(token: contextvars.Token[str]) -> None:
    _correlation_id_var.reset(token)


class JsonLogFormatter(logging.Formatter):
    """Formats every log record as a single valid JSON object."""

    def __init__(self, service_name: str = "rag-service") -> None:
        super().__init__()
        self._service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": self._service_name,
            "logger": record.name,
            "message": record.getMessage(),
        }
        corr_id = getattr(record, "correlation_id", None) or get_correlation_id()
        if corr_id:
            payload["correlation_id"] = corr_id
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_structured_logging(level: str = "INFO", service_name: str = "rag-service") -> None:
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter(service_name=service_name))
    root.handlers = [handler]


# ── Operational Metrics ───────────────────────────────────────────────────────
INGESTION_TOTAL = Counter(
    "rag_file_ingestion_total",
    "Total file ingestion attempts",
    ["status", "content_type"],
)
EMBEDDING_REQUESTS_TOTAL = Counter(
    "rag_embedding_requests_total",
    "Total embedding requests to TEI",
    ["operation", "status"],
)
EMBEDDING_LATENCY_SECONDS = Histogram(
    "rag_embedding_latency_seconds",
    "Embedding call latency in seconds",
    ["operation"],
)
EXECUTION_TOTAL = Counter(
    "rag_ai_execution_total",
    "Total AI executions by terminal or retry outcome",
    ["status"],
)
EXECUTION_ACTIVE_GAUGE = Gauge(
    "rag_ai_execution_active",
    "Currently active AI executions in this worker",
)
EXECUTION_QUEUED_GAUGE = Gauge(
    "rag_ai_execution_queued",
    "Currently queued AI executions in this worker",
)
KAFKA_CONSUME_TOTAL = Counter(
    "rag_kafka_consume_total",
    "Total Kafka records processed by rag-service",
    ["topic", "status"],
)
KAFKA_DLT_TOTAL = Counter(
    "rag_kafka_dlt_total",
    "Total Kafka records published to dead-letter topics",
    ["topic", "status"],
)
RETRIEVAL_LATENCY_SECONDS = Histogram(
    "rag_retrieval_latency_seconds",
    "Retrieval pipeline latency in seconds",
    ["mode"],
)
TIME_TO_FIRST_TOKEN_SECONDS = Histogram(
    "rag_time_to_first_token_seconds",
    "Time from start of execution to first token chunk in seconds",
    ["provider", "model"],
)
EMBEDDING_FAILURES_TOTAL = Counter(
    "rag_embedding_failures_total",
    "Failed embedding attempts",
    ["reason"],
)
RERANKER_REQUESTS_TOTAL = Counter(
    "rag_reranker_requests_total",
    "Total reranker scoring requests",
    ["status"],
)
RERANKER_FALLBACKS_TOTAL = Counter(
    "rag_reranker_fallbacks_total",
    "Reranker fallbacks triggered",
    ["fallback_type"],
)
EXECUTION_RETRIES_TOTAL = Counter(
    "rag_execution_retries_total",
    "AI execution retries scheduled",
    ["error_code"],
)
EXECUTION_COST_TOTAL = Counter(
    "rag_execution_cost_usd_total",
    "Estimated AI execution cost in USD",
    ["provider", "model"],
)
