from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from app.orchestration.pipeline_executor import PipelineExecutor
from app.repositories.direct_ai_repository import DirectAIRepository

log = logging.getLogger(__name__)


class DirectExecutionWorker:
    def __init__(self, max_concurrency: int = 5, max_queue_size: int = 100) -> None:
        self._max_concurrency = max_concurrency
        self._max_queue_size = max_queue_size
        self._queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=max_queue_size)
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._active_tasks: set[asyncio.Task[None]] = set()
        self._dispatcher_task: asyncio.Task[None] | None = None
        self._recovery_task: asyncio.Task[None] | None = None
        self._running = False
        self._executor = PipelineExecutor()
        self._repo = DirectAIRepository()

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._dispatcher_task = asyncio.create_task(self._dispatch_loop())
        self._recovery_task = asyncio.create_task(self._recover_interrupted_jobs())
        log.info(
            "DirectExecutionWorker started with max_concurrency=%d, max_queue_size=%d",
            self._max_concurrency,
            self._max_queue_size,
        )

    async def stop(self) -> None:
        self._running = False
        if self._recovery_task is not None:
            self._recovery_task.cancel()
            try:
                await self._recovery_task
            except asyncio.CancelledError:
                pass
            self._recovery_task = None

        if self._dispatcher_task is not None:
            self._dispatcher_task.cancel()
            try:
                await self._dispatcher_task
            except asyncio.CancelledError:
                pass
            self._dispatcher_task = None

        for task in list(self._active_tasks):
            task.cancel()
        if self._active_tasks:
            await asyncio.gather(*self._active_tasks, return_exceptions=True)
            self._active_tasks.clear()
        log.info("DirectExecutionWorker stopped")

    async def enqueue(self, payload: dict[str, Any]) -> None:
        """Enqueue an execution request with backpressure enforcement."""
        if not self._running:
            raise RuntimeError("DirectExecutionWorker is not running")
        try:
            self._queue.put_nowait(payload)
        except asyncio.QueueFull as exc:
            raise RuntimeError(
                f"Execution queue capacity ({self._max_queue_size}) exceeded; please retry later"
            ) from exc

    async def _recover_interrupted_jobs(self) -> None:
        """Startup recovery: scan database for PENDING or interrupted RUNNING executions and re-enqueue them."""
        try:
            await asyncio.sleep(2.0)
            stuck_jobs = await self._repo.get_recoverable_executions()
            if not stuck_jobs:
                log.info("No interrupted executions to recover")
                return

            log.info("Found %d interrupted execution(s) to recover", len(stuck_jobs))
            for job in stuck_jobs:
                if not self._running:
                    break
                if not job.payload_json:
                    continue
                try:
                    payload = json.loads(job.payload_json)
                    log.info("Recovering execution request_id=%s (retry_count=%d)", job.request_id, job.retry_count)
                    await self._queue.put(payload)
                except Exception as exc:
                    log.error("Failed to recover execution request_id=%s: %s", job.request_id, exc)
        except Exception as exc:
            log.error("Job recovery scan encountered an error: %s", exc)

    async def _dispatch_loop(self) -> None:
        """Dispatcher loop: pulls payloads from bounded queue and spawns bounded concurrent workers."""
        while self._running:
            try:
                payload = await self._queue.get()
            except asyncio.CancelledError:
                break

            task = asyncio.create_task(self._process_payload(payload))
            self._active_tasks.add(task)
            task.add_done_callback(lambda t: self._active_tasks.discard(t))

    async def _process_payload(self, payload: dict[str, Any]) -> None:
        """Process execution with concurrency semaphore and automatic retry on transient failure."""
        async with self._semaphore:
            request_id = str(payload.get("request_id") or "")
            message_id = str(payload.get("message_id") or "")

            if request_id and await self._is_cancelled(request_id):
                log.info("Skipping cancelled execution request_id=%s", request_id)
                self._queue.task_done()
                return

            try:
                if request_id:
                    await self._repo.mark_execution_running(request_id)

                payload["on_partial_persist"] = self._repo.persist_assistant_partial
                payload["on_completed"] = self._repo.complete_execution
                payload["on_failed"] = self._repo.fail_execution
                payload["on_cancelled"] = self._repo.cancel_execution
                payload["is_cancelled"] = self._is_cancelled

                await self._executor.execute(payload)
            except Exception as exc:
                log.error("Execution failed for request_id=%s: %s", request_id, exc)
                should_retry = False
                if request_id:
                    try:
                        should_retry = await self._repo.increment_retry_and_requeue(request_id, str(exc))
                    except Exception as repo_exc:
                        log.error("Failed to update retry status in repo: %s", repo_exc)

                if should_retry and self._running:
                    log.warning("Scheduling retry for execution request_id=%s", request_id)
                    await asyncio.sleep(2.0)
                    try:
                        await self._queue.put(payload)
                    except Exception as enq_exc:
                        log.error("Failed to re-enqueue retried execution %s: %s", request_id, enq_exc)
                        await self._repo.fail_execution(request_id, f"Retry enqueue failed: {enq_exc}")
                else:
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
