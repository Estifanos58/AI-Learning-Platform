"""Tests for DirectExecutionWorker lease-loss handling:
Verifies that when a worker loses its lease, it terminates its local execution
cleanly without cancelling another worker's active execution in the database or Kafka.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import json
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.repositories.direct_ai_repository import DirectAIRepository
from app.workers.direct_execution_worker import DirectExecutionWorker


async def _make_repo(tmp_path):
    db_path = tmp_path / "lease_loss_test.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    return engine, DirectAIRepository(session_factory=session_factory)


async def _seed_execution(repo: DirectAIRepository, request_id: str) -> dict:
    room = await repo.resolve_or_create_chatroom("user-lease", None)
    _, assistant_msg = await repo.create_user_and_assistant_messages(room.id, "Test prompt")
    payload = {
        "request_id": request_id,
        "message_id": assistant_msg.id,
        "chatroom_id": room.id,
        "user_id": "user-lease",
        "ai_model_id": "model-1",
        "content": "Test prompt",
    }
    await repo.create_execution(
        request_id=request_id,
        chatroom_id=room.id,
        message_id=assistant_msg.id,
        user_id="user-lease",
        stream_key=f"stream:ai:{request_id}",
        payload_json=json.dumps(payload),
        max_retries=2,
    )
    return payload


@pytest.mark.asyncio
async def test_worker_lease_loss_does_not_cancel_other_worker(tmp_path):
    engine, repo = await _make_repo(tmp_path)
    try:
        req_id = "req-lease-loss-1"
        payload = await _seed_execution(repo, req_id)

        worker_a_cancelled_locally = asyncio.Event()
        worker_a_hanging = asyncio.Event()

        fake_executor_a = AsyncMock()

        async def slow_execute_a(p):
            try:
                await worker_a_hanging.wait()
            except asyncio.CancelledError:
                worker_a_cancelled_locally.set()
                raise

        fake_executor_a.execute.side_effect = slow_execute_a
        fake_executor_a.publish_cancelled = AsyncMock()

        # Worker A has a fast heartbeat (0.1s)
        worker_a = DirectExecutionWorker(
            worker_id="worker-A",
            max_concurrency=1,
            max_queue_size=2,
            lease_seconds=1,
            heartbeat_seconds=0.1,
            poll_interval_seconds=10.0,
            repo=repo,
            executor=fake_executor_a,
        )
        worker_a.start()

        try:
            # Worker A claims and starts executing
            await worker_a.enqueue(payload)
            await asyncio.sleep(0.15)

            exec_a = await repo.get_execution(req_id)
            assert exec_a is not None
            assert exec_a.status == "RUNNING"
            assert exec_a.worker_id == "worker-A"

            # Simulate lease loss: Worker B takes over the execution
            claimed_by_b = await repo.claim_execution(
                execution_id=req_id,
                worker_id="worker-B",
                lease_seconds=60,
                now=datetime.now(timezone.utc),
            )
            # Force worker_id to worker-B to simulate lease expiration takeover
            async with repo._session_factory() as session:
                from sqlalchemy import update
                from app.models.ai_execution import AIExecution
                await session.execute(
                    update(AIExecution)
                    .where(AIExecution.request_id == req_id)
                    .values(worker_id="worker-B", status="RUNNING")
                )
                await session.commit()

            # Wait for Worker A's heartbeat to fire and detect lost lease
            await asyncio.wait_for(worker_a_cancelled_locally.wait(), timeout=2.0)

            # Give a brief moment for Worker A's CancelledError handler to run
            await asyncio.sleep(0.2)

            # CRITICAL ASSERTIONS:
            # 1. Worker A should NOT have cancelled the DB execution owned by Worker B
            exec_after = await repo.get_execution(req_id)
            assert exec_after is not None
            assert exec_after.status == "RUNNING"
            assert exec_after.worker_id == "worker-B"

            # 2. Worker A should NOT have published CANCELLED to Kafka
            fake_executor_a.publish_cancelled.assert_not_called()

            # 3. Worker B can successfully complete the execution
            completed = await repo.complete_execution(
                execution_id=req_id,
                message_id=payload["message_id"],
                final_content="Completed successfully by Worker B",
                worker_id="worker-B",
            )
            assert completed is True

            final_exec = await repo.get_execution(req_id)
            assert final_exec is not None
            assert final_exec.status == "COMPLETED"

        finally:
            await worker_a.stop()
    finally:
        await engine.dispose()
