from __future__ import annotations

import contextvars
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from prometheus_client import Counter, Histogram

_correlation_id_var: contextvars.ContextVar[str] = contextvars.ContextVar('correlation_id', default='')


def get_correlation_id() -> str:
    return _correlation_id_var.get()


def set_correlation_id(correlation_id: str | None) -> contextvars.Token[str]:
    value = (correlation_id or '').strip() or str(uuid.uuid4())
    return _correlation_id_var.set(value)


def reset_correlation_id(token: contextvars.Token[str]) -> None:
    _correlation_id_var.reset(token)


def mask_email(email: str) -> str:
    if not email or '@' not in email:
        return '***'
    local, domain = email.split('@', 1)
    prefix = local[:2] if len(local) > 2 else local[:1]
    return f'{prefix}***@{domain}'


class JsonLogFormatter(logging.Formatter):
    def __init__(self, service_name: str = 'notification-service') -> None:
        super().__init__()
        self._service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'service': self._service_name,
            'logger': record.name,
            'message': record.getMessage(),
        }
        corr_id = getattr(record, 'correlation_id', None) or get_correlation_id()
        if corr_id:
            payload['correlation_id'] = corr_id
        if record.exc_info:
            payload['exception'] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_structured_logging(level: str = 'INFO', service_name: str = 'notification-service') -> None:
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter(service_name=service_name))
    root.handlers = [handler]


NOTIFICATION_PROCESSED_TOTAL = Counter(
    'notification_events_processed_total',
    'Total notification events processed by outcome',
    ['status'],
)
NOTIFICATION_DLQ_TOTAL = Counter(
    'notification_dlq_published_total',
    'Total notification events published to dead-letter topic',
    ['status'],
)
NOTIFICATION_DELIVERY_LATENCY = Histogram(
    'notification_email_delivery_seconds',
    'Email delivery latency in seconds',
)
