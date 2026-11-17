from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.orchestration.pipeline_executor import PipelineExecutor
from app.repositories.direct_ai_repository import DirectAIRepository

log = logging.getLogger(__name__)


class DirectExecutionWorker:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._task: asyncio.Task[None] | None = None
        self._running = False
        self._executor = PipelineExecutor()
        self._repo = DirectAIRepository()

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._running = False
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def enqueue(self, payload: dict[str, Any]) -> None:
        await self._queue.put(payload)

    async def _run(self) -> None:
        while self._running:
            payload = await self._queue.get()
            request_id = str(payload.get("request_id") or "")
            message_id = str(payload.get("message_id") or "")
            try:
                await self._repo.mark_execution_running(request_id)
                payload["on_partial_persist"] = self._repo.persist_assistant_partial
                payload["on_completed"] = self._repo.complete_execution
                payload["on_failed"] = self._repo.fail_execution
                payload["on_cancelled"] = self._repo.cancel_execution
                payload["is_cancelled"] = self._is_cancelled
                await self._executor.execute(payload)
            except Exception as exc:  # noqa: BLE001
                log.error("Direct execution worker failed for request_id=%s: %s", request_id, exc)
                if request_id:
                    await self._repo.fail_execution(request_id, str(exc))
                elif message_id:
                    await self._repo.persist_assistant_partial(message_id, "")
            finally:
                self._queue.task_done()

    async def _is_cancelled(self, request_id: str) -> bool:
        execution = await self._repo.get_execution(request_id)
        if execution is None:
            return False
        return execution.status == "CANCELLED"
