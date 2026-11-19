from __future__ import annotations

import asyncio
import json
import logging
import os
import socket
import uuid
from typing import Any

from app.config import get_settings
from app.llm.provider_executor import is_retryable_exception
from app.observability import (
    EXECUTION_ACTIVE_GAUGE,
    EXECUTION_QUEUED_GAUGE,
    EXECUTION_TOTAL,
)
from app.orchestration.pipeline_executor import PipelineExecutor
from app.repositories.direct_ai_repository import DirectAIRepository

log = logging.getLogger(__name__)


class DirectExecutionWorker:
    """
    Bounded, lease-backed execution worker supporting multi-instance atomic DB job claiming,
    periodic lease renewal, cross-instance cancellation, and non-blocking exponential retries.
    """

    def __init__(
        self,
        max_concurrency: int | None = None,
        max_queue_size: int | None = None,
        *,
        lease_seconds: int | None = None,
        heartbeat_seconds: float | None = None,
        poll_interval_seconds: float | None = None,
        retry_base_delay_seconds: float | None = None,
        retry_max_delay_seconds: float | None = None,
        worker_id: str | None = None,
        repo: DirectAIRepository | None = None,
        executor: PipelineExecutor | None = None,
    ) -> None:
        settings = get_settings()
        self._max_concurrency = max(1, max_concurrency or settings.worker_max_concurrency)
        self._max_queue_size = max(1, max_queue_size or settings.worker_max_queue_size)
        self._lease_seconds = max(5, lease_seconds or settings.worker_lease_seconds)
        self._heartbeat_seconds = max(0.2, heartbeat_seconds or settings.worker_heartbeat_seconds)
        self._poll_interval_seconds = max(0.1, poll_interval_seconds or settings.worker_poll_interval_seconds)
        self._retry_base_delay_seconds = max(0.05, retry_base_delay_seconds if retry_base_delay_seconds is not None else settings.worker_retry_base_delay_seconds)
        self._retry_max_delay_seconds = max(self._retry_base_delay_seconds, retry_max_delay_seconds if retry_max_delay_seconds is not None else settings.worker_retry_max_delay_seconds)

        self._worker_id = worker_id or f"{socket.gethostname()}-{os.getpid()}-{uuid.uuid4().hex[:8]}"
        self._queue: asyncio.Queue[tuple[dict[str, Any], bool]] = asyncio.Queue(maxsize=self._max_queue_size)
        self._worker_tasks: list[asyncio.Task[None]] = []
        self._recovery_task: asyncio.Task[None] | None = None
        self._in_flight_tasks: dict[str, asyncio.Task[None]] = {}
        self._enqueued_ids: set[str] = set()
        self._active_count = 0
        self._running = False
        self._executor = executor or PipelineExecutor()
        self._repo = repo or DirectAIRepository()

    @property
    def worker_id(self) -> str:
        return self._worker_id

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def active_count(self) -> int:
        return self._active_count

    @property
    def queue_size(self) -> int:
        return self._queue.qsize()

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._worker_tasks = [
            asyncio.create_task(self._worker_loop(idx), name=f"direct-exec-worker-{idx}")
            for idx in range(self._max_concurrency)
        ]
        self._recovery_task = asyncio.create_task(
            self._recovery_poll_loop(), name="direct-exec-recovery"
        )
        log.info(
            "DirectExecutionWorker started: worker_id=%s max_concurrency=%d max_queue_size=%d lease_seconds=%d",
            self._worker_id,
            self._max_concurrency,
            self._max_queue_size,
            self._lease_seconds,
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

        for task in self._worker_tasks:
            task.cancel()
        if self._worker_tasks:
            await asyncio.gather(*self._worker_tasks, return_exceptions=True)
            self._worker_tasks.clear()

        self._in_flight_tasks.clear()
        self._enqueued_ids.clear()
        self._active_count = 0
        EXECUTION_ACTIVE_GAUGE.set(0)
        EXECUTION_QUEUED_GAUGE.set(0)
        log.info("DirectExecutionWorker stopped: worker_id=%s", self._worker_id)

    async def enqueue(self, payload: dict[str, Any]) -> None:
        """Enqueue a freshly created execution with strict bounded queue backpressure."""
        if not self._running:
            raise RuntimeError("DirectExecutionWorker is not running")
        request_id = str(payload.get("request_id") or "")
        if request_id and request_id in self._enqueued_ids:
            return
        try:
            self._queue.put_nowait((dict(payload), False))
            if request_id:
                self._enqueued_ids.add(request_id)
            EXECUTION_QUEUED_GAUGE.set(self._queue.qsize())
        except asyncio.QueueFull as exc:
            raise RuntimeError(
                f"Execution queue capacity ({self._max_queue_size}) exceeded; please retry later"
            ) from exc

    def cancel_local(self, request_id: str) -> None:
        """Signal local cancellation immediately for an in-flight execution."""
        PipelineExecutor.cancel(request_id)
        task = self._in_flight_tasks.get(request_id)
        if task is not None and not task.done():
            task.cancel()

    async def _recovery_poll_loop(self) -> None:
        """
        Periodically claims due retries (PENDING with next_retry_at <= now) and
        reclaims expired leases (RUNNING with lease_expires_at <= now) atomically.
        """
        while self._running:
            try:
                available_capacity = self._max_queue_size - self._queue.qsize()
                if available_capacity > 0:
                    claimed_jobs = await self._repo.claim_due_executions(
                        worker_id=self._worker_id,
                        limit=min(available_capacity, self._max_concurrency),
                        lease_seconds=self._lease_seconds,
                    )
                    for job in claimed_jobs:
                        if not self._running:
                            break
                        if not job.payload_json:
                            await self._repo.fail_execution(
                                job.request_id,
                                "Missing persisted execution payload",
                                error_code="MISSING_PAYLOAD",
                                worker_id=self._worker_id,
                            )
                            continue
                        try:
                            payload = json.loads(job.payload_json)
                            self._queue.put_nowait((payload, True))
                            self._enqueued_ids.add(job.request_id)
                            EXECUTION_QUEUED_GAUGE.set(self._queue.qsize())
                            log.info(
                                "Recovered/claimed execution request_id=%s worker_id=%s retry_count=%d",
                                job.request_id,
                                self._worker_id,
                                job.retry_count,
                            )
                        except asyncio.QueueFull:
                            # Release lease so another poll cycle or instance can pick it up
                            await self._repo.schedule_retry_or_fail(
                                job.request_id,
                                self._worker_id,
                                "Local worker queue full during recovery",
                                error_code="QUEUE_FULL",
                                retryable=True,
                                base_delay_seconds=1.0,
                                max_delay_seconds=5.0,
                            )
                            break
                        except Exception as exc:
                            log.error(
                                "Failed to deserialize payload for execution request_id=%s: %s",
                                job.request_id,
                                exc,
                            )
                            await self._repo.fail_execution(
                                job.request_id,
                                f"Corrupted execution payload: {exc}",
                                error_code="CORRUPT_PAYLOAD",
                                worker_id=self._worker_id,
                            )
            except asyncio.CancelledError:
                break
            except Exception as exc:
                log.error("Execution recovery/claim poll error: %s", exc)

            await asyncio.sleep(self._poll_interval_seconds)

    async def _worker_loop(self, worker_slot: int) -> None:
        """Fixed worker coroutine pool ensuring active executions never exceed max_concurrency."""
        while self._running:
            try:
                payload, already_claimed = await self._queue.get()
            except asyncio.CancelledError:
                break

            EXECUTION_QUEUED_GAUGE.set(self._queue.qsize())
            request_id = str(payload.get("request_id") or "")
            self._active_count += 1
            EXECUTION_ACTIVE_GAUGE.set(self._active_count)
            try:
                await self._process_payload(payload, already_claimed=already_claimed)
            except asyncio.CancelledError:
                if not self._running:
                    break
            except Exception as exc:  # noqa: BLE001
                log.error(
                    "Unhandled worker error in slot=%d request_id=%s: %s",
                    worker_slot,
                    request_id,
                    exc,
                )
            finally:
                self._active_count = max(0, self._active_count - 1)
                EXECUTION_ACTIVE_GAUGE.set(self._active_count)
                if request_id:
                    self._enqueued_ids.discard(request_id)
                self._queue.task_done()

    async def _process_payload(self, payload: dict[str, Any], *, already_claimed: bool) -> None:
        request_id = str(payload.get("request_id") or "")
        message_id = str(payload.get("message_id") or request_id)
        chatroom_id = str(payload.get("chatroom_id") or payload.get("chatroomId") or "")

        if request_id:
            if not already_claimed:
                claimed = await self._repo.claim_execution(
                    execution_id=request_id,
                    worker_id=self._worker_id,
                    lease_seconds=self._lease_seconds,
                )
                if claimed is None:
                    log.info(
                        "Skipping execution request_id=%s (already claimed, cancelled, or terminal)",
                        request_id,
                    )
                    return

            if await self._is_cancelled(request_id):
                log.info("Skipping cancelled execution request_id=%s", request_id)
                return

        exec_payload = dict(payload)
        exec_payload["defer_failure_handling"] = True
        exec_payload["on_partial_persist"] = self._repo.persist_assistant_partial
        exec_payload["on_completed"] = self._complete_with_worker_guard
        exec_payload["on_failed"] = self._repo.fail_execution
        exec_payload["on_cancelled"] = self._repo.cancel_execution
        exec_payload["is_cancelled"] = self._is_cancelled

        run_task = asyncio.create_task(self._executor.execute(exec_payload))
        if request_id:
            self._in_flight_tasks[request_id] = run_task

        heartbeat_task: asyncio.Task[None] | None = None
        if request_id:
            heartbeat_task = asyncio.create_task(
                self._heartbeat_loop(request_id, run_task)
            )

        try:
            await run_task
            EXECUTION_TOTAL.labels(status="completed").inc()
        except asyncio.CancelledError:
            if not self._running:
                raise
            EXECUTION_TOTAL.labels(status="cancelled").inc()
            if request_id:
                existing = await self._repo.get_execution(request_id)
                if existing is None or existing.status != "CANCELLED":
                    await self._repo.cancel_execution(request_id)
                    await self._executor.publish_cancelled(
                        chatroom_id=chatroom_id,
                        message_id=message_id,
                        request_id=request_id,
                    )
        except Exception as exc:  # noqa: BLE001
            retryable = is_retryable_exception(exc)
            error_code = str(getattr(exc, "error_code", type(exc).__name__))
            log.error(
                "Execution error for request_id=%s retryable=%s code=%s: %s",
                request_id,
                retryable,
                error_code,
                exc,
            )

            requeued = False
            if request_id:
                requeued = await self._repo.schedule_retry_or_fail(
                    execution_id=request_id,
                    worker_id=self._worker_id,
                    error=str(exc),
                    error_code=error_code,
                    retryable=retryable,
                    base_delay_seconds=self._retry_base_delay_seconds,
                    max_delay_seconds=self._retry_max_delay_seconds,
                )

            if requeued:
                EXECUTION_TOTAL.labels(status="retried").inc()
                log.warning("Scheduled retry for execution request_id=%s", request_id)
            else:
                EXECUTION_TOTAL.labels(status="failed").inc()
                await self._executor.publish_failed(
                    chatroom_id=chatroom_id,
                    message_id=message_id,
                    request_id=request_id,
                    error=str(exc),
                )
        finally:
            if heartbeat_task is not None:
                heartbeat_task.cancel()
                try:
                    await heartbeat_task
                except asyncio.CancelledError:
                    pass
            if request_id:
                self._in_flight_tasks.pop(request_id, None)

    async def _complete_with_worker_guard(
        self, execution_id: str, message_id: str, final_content: str
    ) -> None:
        await self._repo.complete_execution(
            execution_id=execution_id,
            message_id=message_id,
            final_content=final_content,
            worker_id=self._worker_id,
        )

    async def _heartbeat_loop(
        self, request_id: str, run_task: asyncio.Task[None]
    ) -> None:
        """Renews the worker lease and cancels the running task if the execution was cancelled externally."""
        while not run_task.done():
            await asyncio.sleep(self._heartbeat_seconds)
            if run_task.done():
                break
            try:
                still_owned = await self._repo.renew_lease(
                    execution_id=request_id,
                    worker_id=self._worker_id,
                    lease_seconds=self._lease_seconds,
                )
                if not still_owned:
                    log.warning(
                        "Lost lease or execution cancelled externally for request_id=%s; cancelling local task",
                        request_id,
                    )
                    PipelineExecutor.cancel(request_id)
                    run_task.cancel()
                    break
            except asyncio.CancelledError:
                break
            except Exception as exc:
                log.warning("Lease renewal error for request_id=%s: %s", request_id, exc)

    async def _is_cancelled(self, request_id: str) -> bool:
        execution = await self._repo.get_execution(request_id)
        if execution is None:
            return False
        return execution.status == "CANCELLED"
