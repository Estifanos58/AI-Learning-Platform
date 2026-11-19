"""Integration tests for DirectExecutionWorker: bounded concurrency, retries, atomic leases, recovery, and cancellation."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.llm.provider_executor import ProviderPermanentError, ProviderRateLimitError
from app.repositories.direct_ai_repository import DirectAIRepository
from app.workers.direct_execution_worker import DirectExecutionWorker


async def _make_repo(tmp_path):
    db_path = tmp_path / "worker_test.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    return engine, DirectAIRepository(session_factory=session_factory)


async def _seed_execution(repo: DirectAIRepository, request_id: str, max_retries: int = 2) -> dict:
    room = await repo.resolve_or_create_chatroom("user-1", None)
    _, assistant_msg = await repo.create_user_and_assistant_messages(room.id, "Explain Raft")
    payload = {
        "request_id": request_id,
        "message_id": assistant_msg.id,
        "chatroom_id": room.id,
        "user_id": "user-1",
        "ai_model_id": "model-1",
        "content": "Explain Raft",
    }
    await repo.create_execution(
        request_id=request_id,
        chatroom_id=room.id,
        message_id=assistant_msg.id,
        user_id="user-1",
        stream_key=f"stream:ai:{request_id}",
        payload_json=json.dumps(payload),
        max_retries=max_retries,
    )
    return payload


@pytest.mark.asyncio
async def test_bounded_concurrency_and_queue_backpressure(tmp_path):
    engine, repo = await _make_repo(tmp_path)
    try:
        release_event = asyncio.Event()
        two_active = asyncio.Event()
        active_now = 0
        max_seen = 0

        fake_executor = AsyncMock()

        async def slow_execute(payload):
            nonlocal active_now, max_seen
            active_now += 1
            max_seen = max(max_seen, active_now)
            if active_now == 2:
                two_active.set()
            await release_event.wait()
            active_now -= 1
            await payload["on_completed"](payload["request_id"], payload["message_id"], "done")

        fake_executor.execute.side_effect = slow_execute

        worker = DirectExecutionWorker(
            max_concurrency=2,
            max_queue_size=2,
            poll_interval_seconds=10.0,
            repo=repo,
            executor=fake_executor,
        )
        worker.start()
        try:
            p1 = await _seed_execution(repo, "req-1")
            p2 = await _seed_execution(repo, "req-2")
            p3 = await _seed_execution(repo, "req-3")
            p4 = await _seed_execution(repo, "req-4")
            p5 = await _seed_execution(repo, "req-5")

            await worker.enqueue(p1)
            await worker.enqueue(p2)
            # Wait deterministically until both workers are actively executing
            await asyncio.wait_for(two_active.wait(), timeout=2.0)
            assert worker.active_count == 2
            assert max_seen == 2

            # Fill the bounded queue (size=2)
            await worker.enqueue(p3)
            await worker.enqueue(p4)
            assert worker.queue_size == 2

            # 5th job must be rejected with queue capacity error
            with pytest.raises(RuntimeError, match="capacity"):
                await worker.enqueue(p5)

            release_event.set()
            for _ in range(40):
                rec = await repo.get_execution("req-4")
                if rec and rec.status == "COMPLETED":
                    break
                await asyncio.sleep(0.05)
            assert max_seen == 2
            assert (await repo.get_execution("req-4")).status == "COMPLETED"
        finally:
            await worker.stop()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_transient_ai_failure_retries_and_eventually_succeeds(tmp_path):
    engine, repo = await _make_repo(tmp_path)
    try:
        attempts = 0
        fake_executor = AsyncMock()

        async def flaky_execute(payload):
            nonlocal attempts
            attempts += 1
            if attempts < 2:
                raise ProviderRateLimitError("429 Too Many Requests")
            await payload["on_completed"](payload["request_id"], payload["message_id"], "Recovered answer")

        fake_executor.execute.side_effect = flaky_execute
        fake_executor.publish_failed = AsyncMock()

        worker = DirectExecutionWorker(
            max_concurrency=2,
            max_queue_size=10,
            poll_interval_seconds=0.1,
            retry_base_delay_seconds=0.05,
            retry_max_delay_seconds=0.1,
            repo=repo,
            executor=fake_executor,
        )
        worker.start()
        try:
            payload = await _seed_execution(repo, "req-retry-1", max_retries=3)
            await worker.enqueue(payload)

            for _ in range(40):
                rec = await repo.get_execution("req-retry-1")
                if rec and rec.status == "COMPLETED":
                    break
                await asyncio.sleep(0.05)

            rec = await repo.get_execution("req-retry-1")
            assert rec is not None
            assert rec.status == "COMPLETED"
            assert rec.retry_count == 1
            assert attempts == 2
            fake_executor.publish_failed.assert_not_called()
        finally:
            await worker.stop()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_permanent_failure_does_not_retry(tmp_path):
    engine, repo = await _make_repo(tmp_path)
    try:
        attempts = 0
        fake_executor = AsyncMock()

        async def permanent_fail(_payload):
            nonlocal attempts
            attempts += 1
            raise ProviderPermanentError("Invalid API key", error_code="PROVIDER_UNAUTHORIZED")

        fake_executor.execute.side_effect = permanent_fail
        fake_executor.publish_failed = AsyncMock()

        worker = DirectExecutionWorker(
            max_concurrency=1,
            max_queue_size=5,
            poll_interval_seconds=0.1,
            repo=repo,
            executor=fake_executor,
        )
        worker.start()
        try:
            payload = await _seed_execution(repo, "req-perm-1", max_retries=3)
            await worker.enqueue(payload)
            for _ in range(40):
                rec = await repo.get_execution("req-perm-1")
                if rec and rec.status == "FAILED":
                    break
                await asyncio.sleep(0.05)

            rec = await repo.get_execution("req-perm-1")
            assert rec is not None
            assert rec.status == "FAILED"
            assert attempts == 1
            assert rec.last_error_code == "PROVIDER_UNAUTHORIZED"
            fake_executor.publish_failed.assert_awaited_once()
        finally:
            await worker.stop()
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_atomic_multi_instance_claiming_and_expired_lease_recovery(tmp_path):
    engine, repo = await _make_repo(tmp_path)
    try:
        await _seed_execution(repo, "req-atomic-1")

        # Two instances race to claim the same execution
        claim_a, claim_b = await asyncio.gather(
            repo.claim_execution("req-atomic-1", worker_id="worker-A", lease_seconds=60),
            repo.claim_execution("req-atomic-1", worker_id="worker-B", lease_seconds=60),
        )
        winners = [c for c in (claim_a, claim_b) if c is not None]
        assert len(winners) == 1
        winner = winners[0]
        assert winner.status == "RUNNING"

        # Healthy lease cannot be stolen by another worker
        stolen = await repo.claim_due_executions(worker_id="worker-C", limit=5, lease_seconds=60)
        assert stolen == []

        # Simulate worker crash: expire the lease in the past
        future_time = datetime.now(timezone.utc) + timedelta(seconds=120)
        reclaimed = await repo.claim_due_executions(
            worker_id="worker-C",
            limit=5,
            lease_seconds=60,
            now=future_time,
        )
        assert len(reclaimed) == 1
        assert reclaimed[0].request_id == "req-atomic-1"
        assert reclaimed[0].worker_id == "worker-C"
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_cross_instance_cancellation_stops_inflight_execution(tmp_path):
    engine, repo = await _make_repo(tmp_path)
    try:
        started = asyncio.Event()
        cancelled_observed = asyncio.Event()
        fake_executor = AsyncMock()

        async def long_running(_payload):
            started.set()
            try:
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                cancelled_observed.set()
                raise

        fake_executor.execute.side_effect = long_running
        fake_executor.publish_cancelled = AsyncMock()

        worker = DirectExecutionWorker(
            max_concurrency=1,
            max_queue_size=5,
            lease_seconds=30,
            heartbeat_seconds=0.05,
            poll_interval_seconds=10.0,
            repo=repo,
            executor=fake_executor,
        )
        worker.start()
        try:
            payload = await _seed_execution(repo, "req-cancel-1")
            await worker.enqueue(payload)
            await asyncio.wait_for(started.wait(), timeout=2.0)

            # Cancel via DB (simulating another RAG instance receiving CancelExecution)
            await repo.cancel_execution("req-cancel-1")
            await asyncio.wait_for(cancelled_observed.wait(), timeout=2.0)

            rec = await repo.get_execution("req-cancel-1")
            assert rec is not None
            assert rec.status == "CANCELLED"
        finally:
            await worker.stop()
    finally:
        await engine.dispose()
