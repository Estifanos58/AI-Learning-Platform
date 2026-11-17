import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models.ai_execution import AIExecution
from app.repositories.direct_ai_repository import DirectAIRepository
from app.workers.direct_execution_worker import DirectExecutionWorker


async def _prepare_session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


def test_enqueue_execution_bounded_queue():
    async def run():
        session_factory = await _prepare_session_factory()
        worker = DirectExecutionWorker(session_factory, max_queue_size=2, max_concurrency=1)

        ok1 = await worker.enqueue_execution("exec-1")
        ok2 = await worker.enqueue_execution("exec-2")
        ok3 = await worker.enqueue_execution("exec-3")

        assert ok1 is True
        assert ok2 is True
        assert ok3 is False
        assert worker.queue_size == 2

    asyncio.run(run())


def test_startup_recovery_enqueues_pending_and_running_jobs():
    async def run():
        session_factory = await _prepare_session_factory()

        # Insert some pending/running executions
        async with session_factory() as session:
            repo = DirectAIRepository(session)
            exec1 = await repo.create_execution(
                execution_id="rec-1",
                user_id="user-1",
                model_name="gemini-2.0",
                mode="chat",
                prompt="test prompt 1",
                status="PENDING",
            )
            exec2 = await repo.create_execution(
                execution_id="rec-2",
                user_id="user-1",
                model_name="gemini-2.0",
                mode="chat",
                prompt="test prompt 2",
                status="RUNNING",
            )
            exec3 = await repo.create_execution(
                execution_id="done-1",
                user_id="user-1",
                model_name="gemini-2.0",
                mode="chat",
                prompt="test prompt 3",
                status="COMPLETED",
            )
            await session.commit()

        # Verify get_recoverable_executions returns rec-1 and rec-2 but not done-1
        async with session_factory() as session:
            repo = DirectAIRepository(session)
            recoverable = await repo.get_recoverable_executions()
            rec_ids = [e.execution_id for e in recoverable]
            assert "rec-1" in rec_ids
            assert "rec-2" in rec_ids
            assert "done-1" not in rec_ids

    asyncio.run(run())


def test_retry_and_requeue_increment():
    async def run():
        session_factory = await _prepare_session_factory()

        async with session_factory() as session:
            repo = DirectAIRepository(session)
            await repo.create_execution(
                execution_id="retry-1",
                user_id="user-1",
                model_name="gemini-2.0",
                mode="chat",
                prompt="test prompt",
                status="RUNNING",
                max_retries=3,
            )
            await session.commit()

        # Increment retry 1 -> should succeed and set status PENDING
        async with session_factory() as session:
            repo = DirectAIRepository(session)
            can_retry = await repo.increment_retry_and_requeue("retry-1")
            await session.commit()
            assert can_retry is True

        async with session_factory() as session:
            repo = DirectAIRepository(session)
            rec = await repo.get_execution("retry-1")
            assert rec.retry_count == 1
            assert rec.status == "PENDING"

        # Increment retry 2 -> should succeed
        async with session_factory() as session:
            repo = DirectAIRepository(session)
            can_retry = await repo.increment_retry_and_requeue("retry-1")
            await session.commit()
            assert can_retry is True

        # Increment retry 3 -> should succeed
        async with session_factory() as session:
            repo = DirectAIRepository(session)
            can_retry = await repo.increment_retry_and_requeue("retry-1")
            await session.commit()
            assert can_retry is True

        # Increment retry 4 -> exceeds max_retries (3) -> should return False and mark FAILED
        async with session_factory() as session:
            repo = DirectAIRepository(session)
            can_retry = await repo.increment_retry_and_requeue("retry-1")
            await session.commit()
            assert can_retry is False

        async with session_factory() as session:
            repo = DirectAIRepository(session)
            rec = await repo.get_execution("retry-1")
            assert rec.status == "FAILED"
            assert "Exceeded max retries" in rec.error_message

    asyncio.run(run())
