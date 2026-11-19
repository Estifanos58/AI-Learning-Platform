from __future__ import annotations

from app.config import get_settings
from app.workers.direct_execution_worker import DirectExecutionWorker

_worker: DirectExecutionWorker | None = None


def get_direct_execution_worker() -> DirectExecutionWorker:
    global _worker
    if _worker is None:
        settings = get_settings()
        _worker = DirectExecutionWorker(
            max_concurrency=settings.worker_max_concurrency,
            max_queue_size=settings.worker_max_queue_size,
            lease_seconds=settings.worker_lease_seconds,
            heartbeat_seconds=settings.worker_heartbeat_seconds,
            poll_interval_seconds=settings.worker_poll_interval_seconds,
            retry_base_delay_seconds=settings.worker_retry_base_delay_seconds,
            retry_max_delay_seconds=settings.worker_retry_max_delay_seconds,
        )
    return _worker

