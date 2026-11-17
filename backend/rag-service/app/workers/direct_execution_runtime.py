from __future__ import annotations

from app.workers.direct_execution_worker import DirectExecutionWorker

_worker: DirectExecutionWorker | None = None


def get_direct_execution_worker() -> DirectExecutionWorker:
    global _worker
    if _worker is None:
        _worker = DirectExecutionWorker()
    return _worker
