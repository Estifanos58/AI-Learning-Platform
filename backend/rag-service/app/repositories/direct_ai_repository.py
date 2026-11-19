from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable

from sqlalchemy import and_, delete, desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.ai_execution import AIExecution
from app.models.chat_room import ChatRoom
from app.models.message import Message


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class DirectExecutionContext:
    execution_id: str
    chatroom_id: str
    user_message_id: str
    assistant_message_id: str
    stream_key: str


class DirectAIRepository:
    def __init__(self, session_factory: Callable[[], AsyncSession] | None = None) -> None:
        self._session_factory = session_factory or AsyncSessionLocal

    async def resolve_or_create_chatroom(self, user_id: str, chatroom_id: str | None) -> ChatRoom:
        async with self._session_factory() as session:
            if chatroom_id:
                existing = await session.get(ChatRoom, chatroom_id)
                if existing is None or existing.user_id != user_id:
                    raise PermissionError("Chatroom not found")
                return existing

            room = ChatRoom(user_id=user_id, title=None)
            session.add(room)
            await session.commit()
            await session.refresh(room)
            return room

    async def set_chatroom_title_if_empty(self, chatroom_id: str, title: str) -> None:
        normalized = (title or "").strip()
        if not normalized:
            return
        async with self._session_factory() as session:
            room = await session.get(ChatRoom, chatroom_id)
            if room is None:
                return
            if room.title is None or not room.title.strip():
                room.title = normalized[:120]
                room.updated_at = _utcnow()
                await session.commit()

    async def create_user_and_assistant_messages(
        self,
        chatroom_id: str,
        user_prompt: str,
    ) -> tuple[Message, Message]:
        async with self._session_factory() as session:
            user_message = Message(
                chatroom_id=chatroom_id,
                role="USER",
                content=user_prompt,
                status="COMPLETED",
            )
            assistant_message = Message(
                chatroom_id=chatroom_id,
                role="ASSISTANT",
                content="",
                status="STREAMING",
            )
            session.add(user_message)
            session.add(assistant_message)
            await session.commit()
            await session.refresh(user_message)
            await session.refresh(assistant_message)
            return user_message, assistant_message

    async def create_execution(
        self,
        request_id: str,
        chatroom_id: str,
        message_id: str,
        user_id: str,
        stream_key: str,
        payload_json: str | None = None,
        max_retries: int = 3,
    ) -> AIExecution:
        async with self._session_factory() as session:
            execution = AIExecution(
                request_id=request_id,
                chatroom_id=chatroom_id,
                message_id=message_id,
                user_id=user_id,
                stream_key=stream_key,
                status="PENDING",
                payload_json=payload_json,
                retry_count=0,
                max_retries=max_retries,
                worker_id=None,
                claimed_at=None,
                heartbeat_at=None,
                lease_expires_at=None,
                next_retry_at=None,
                last_error_code=None,
                version=0,
                error=None,
            )
            session.add(execution)
            await session.commit()
            await session.refresh(execution)
            return execution

    async def claim_execution(
        self,
        execution_id: str,
        worker_id: str,
        lease_seconds: int = 90,
        now: datetime | None = None,
    ) -> AIExecution | None:
        """
        Atomically claim a specific execution if it is PENDING (and due) or has an expired lease.
        Prevents duplicate execution across multiple RAG instances.
        """
        current_time = now or _utcnow()
        lease_until = current_time + timedelta(seconds=max(5, lease_seconds))

        async with self._session_factory() as session:
            claimable_cond = or_(
                and_(
                    AIExecution.status == "PENDING",
                    or_(
                        AIExecution.next_retry_at.is_(None),
                        AIExecution.next_retry_at <= current_time,
                    ),
                ),
                and_(
                    AIExecution.status == "RUNNING",
                    AIExecution.lease_expires_at.isnot(None),
                    AIExecution.lease_expires_at <= current_time,
                ),
            )
            stmt = (
                update(AIExecution)
                .where(AIExecution.request_id == execution_id, claimable_cond)
                .values(
                    status="RUNNING",
                    worker_id=worker_id,
                    claimed_at=current_time,
                    heartbeat_at=current_time,
                    lease_expires_at=lease_until,
                    next_retry_at=None,
                    version=AIExecution.version + 1,
                )
                .execution_options(synchronize_session=False)
            )
            result = await session.execute(stmt)
            if (result.rowcount or 0) == 0:
                await session.rollback()
                return None
            await session.commit()
            session.expire_all()
            return await session.get(AIExecution, execution_id)

    async def claim_due_executions(
        self,
        worker_id: str,
        limit: int = 10,
        lease_seconds: int = 90,
        now: datetime | None = None,
    ) -> list[AIExecution]:
        """
        Atomically claim up to `limit` due PENDING executions or RUNNING executions with expired leases.
        Uses SELECT ... FOR UPDATE SKIP LOCKED on PostgreSQL and atomic conditional UPDATEs on SQLite.
        """
        if limit <= 0:
            return []

        current_time = now or _utcnow()
        lease_until = current_time + timedelta(seconds=max(5, lease_seconds))

        async with self._session_factory() as session:
            dialect = session.bind.dialect.name if session.bind is not None else ""
            claimable_cond = and_(
                AIExecution.payload_json.isnot(None),
                or_(
                    and_(
                        AIExecution.status == "PENDING",
                        or_(
                            AIExecution.next_retry_at.is_(None),
                            AIExecution.next_retry_at <= current_time,
                        ),
                    ),
                    and_(
                        AIExecution.status == "RUNNING",
                        AIExecution.lease_expires_at.isnot(None),
                        AIExecution.lease_expires_at <= current_time,
                    ),
                ),
            )

            stmt = (
                select(AIExecution)
                .where(claimable_cond)
                .order_by(AIExecution.created_at.asc())
                .limit(limit)
            )
            if dialect == "postgresql":
                stmt = stmt.with_for_update(skip_locked=True)
                candidates = list((await session.execute(stmt)).scalars().all())
                if not candidates:
                    return []
                claimed_ids = [c.request_id for c in candidates]
                await session.execute(
                    update(AIExecution)
                    .where(AIExecution.request_id.in_(claimed_ids))
                    .values(
                        status="RUNNING",
                        worker_id=worker_id,
                        claimed_at=current_time,
                        heartbeat_at=current_time,
                        lease_expires_at=lease_until,
                        next_retry_at=None,
                        version=AIExecution.version + 1,
                    )
                    .execution_options(synchronize_session=False)
                )
                await session.commit()
                session.expire_all()
                res = await session.execute(
                    select(AIExecution).where(AIExecution.request_id.in_(claimed_ids))
                )
                return list(res.scalars().all())

            # SQLite / generic atomic conditional update loop
            candidates = list((await session.execute(stmt)).scalars().all())
            candidate_pairs = [(c.request_id, c.version) for c in candidates]
            claimed_ids_sqlite: list[str] = []
            for req_id, req_version in candidate_pairs:
                upd = (
                    update(AIExecution)
                    .where(
                        AIExecution.request_id == req_id,
                        AIExecution.version == req_version,
                        claimable_cond,
                    )
                    .values(
                        status="RUNNING",
                        worker_id=worker_id,
                        claimed_at=current_time,
                        heartbeat_at=current_time,
                        lease_expires_at=lease_until,
                        next_retry_at=None,
                        version=AIExecution.version + 1,
                    )
                    .execution_options(synchronize_session=False)
                )
                res = await session.execute(upd)
                if (res.rowcount or 0) == 1:
                    await session.commit()
                    claimed_ids_sqlite.append(req_id)
                else:
                    await session.rollback()
            if not claimed_ids_sqlite:
                return []
            session.expire_all()
            refreshed = await session.execute(
                select(AIExecution).where(AIExecution.request_id.in_(claimed_ids_sqlite))
            )
            return list(refreshed.scalars().all())

    async def renew_lease(
        self,
        execution_id: str,
        worker_id: str,
        lease_seconds: int = 90,
        now: datetime | None = None,
    ) -> bool:
        """Renew worker lease only if execution is still RUNNING and owned by `worker_id`."""
        current_time = now or _utcnow()
        lease_until = current_time + timedelta(seconds=max(5, lease_seconds))

        async with self._session_factory() as session:
            stmt = (
                update(AIExecution)
                .where(
                    AIExecution.request_id == execution_id,
                    AIExecution.status == "RUNNING",
                    AIExecution.worker_id == worker_id,
                )
                .values(
                    heartbeat_at=current_time,
                    lease_expires_at=lease_until,
                )
                .execution_options(synchronize_session=False)
            )
            res = await session.execute(stmt)
            await session.commit()
            return (res.rowcount or 0) == 1

    async def get_recoverable_executions(self, now: datetime | None = None) -> list[AIExecution]:
        """Returns due PENDING or lease-expired RUNNING executions."""
        current_time = now or _utcnow()
        async with self._session_factory() as session:
            stmt = (
                select(AIExecution)
                .where(
                    AIExecution.payload_json.isnot(None),
                    or_(
                        and_(
                            AIExecution.status == "PENDING",
                            or_(
                                AIExecution.next_retry_at.is_(None),
                                AIExecution.next_retry_at <= current_time,
                            ),
                        ),
                        and_(
                            AIExecution.status == "RUNNING",
                            or_(
                                AIExecution.lease_expires_at.is_(None),
                                AIExecution.lease_expires_at <= current_time,
                            ),
                        ),
                    ),
                )
                .order_by(AIExecution.created_at.asc())
            )
            res = await session.execute(stmt)
            return list(res.scalars().all())

    async def schedule_retry_or_fail(
        self,
        execution_id: str,
        worker_id: str | None,
        error: str,
        *,
        error_code: str = "EXECUTION_ERROR",
        retryable: bool = True,
        base_delay_seconds: float = 2.0,
        max_delay_seconds: float = 60.0,
        now: datetime | None = None,
    ) -> bool:
        """
        Atomically schedules a retry with exponential backoff if retryable and retry budget remains;
        otherwise transitions the execution and assistant message to FAILED.
        Returns True if requeued for retry, False if terminal (FAILED or CANCELLED).
        """
        current_time = now or _utcnow()
        async with self._session_factory() as session:
            execution = await session.get(AIExecution, execution_id)
            if execution is None or execution.status in {"CANCELLED", "COMPLETED", "FAILED"}:
                return False
            if worker_id and execution.worker_id and execution.worker_id != worker_id:
                # Lease was taken over by another worker; do not overwrite its state
                return False

            next_retry_count = execution.retry_count + 1
            if retryable and next_retry_count <= execution.max_retries:
                backoff = min(max_delay_seconds, base_delay_seconds * (2 ** (next_retry_count - 1)))
                jitter = random.uniform(0.0, min(1.0, backoff * 0.25))
                next_retry_at = current_time + timedelta(seconds=backoff + jitter)

                execution.retry_count = next_retry_count
                execution.status = "PENDING"
                execution.worker_id = None
                execution.lease_expires_at = None
                execution.heartbeat_at = None
                execution.next_retry_at = next_retry_at
                execution.last_error_code = error_code[:64]
                execution.error = f"Retry {next_retry_count}/{execution.max_retries}: {error[:500]}"
                execution.version += 1
                await session.commit()
                return True

            execution.retry_count = next_retry_count if retryable else execution.retry_count
            execution.status = "FAILED"
            execution.worker_id = None
            execution.lease_expires_at = None
            execution.next_retry_at = None
            execution.completed_at = current_time
            execution.last_error_code = error_code[:64]
            execution.error = error[:4000]
            execution.version += 1

            message = await session.get(Message, execution.message_id)
            if message is not None:
                message.status = "FAILED"
                message.updated_at = current_time
            await session.commit()
            return False

    async def increment_retry_and_requeue(self, execution_id: str, error: str) -> bool:
        """Backward-compatible wrapper around schedule_retry_or_fail."""
        return await self.schedule_retry_or_fail(
            execution_id=execution_id,
            worker_id=None,
            error=error,
            retryable=True,
        )

    async def mark_execution_running(self, execution_id: str, worker_id: str | None = None, lease_seconds: int = 90) -> None:
        current_time = _utcnow()
        async with self._session_factory() as session:
            execution = await session.get(AIExecution, execution_id)
            if execution is None or execution.status in {"CANCELLED", "COMPLETED"}:
                return
            execution.status = "RUNNING"
            execution.worker_id = worker_id or execution.worker_id
            execution.claimed_at = current_time
            execution.heartbeat_at = current_time
            execution.lease_expires_at = current_time + timedelta(seconds=max(5, lease_seconds))
            execution.error = None
            execution.version += 1
            await session.commit()

    async def persist_assistant_partial(self, message_id: str, buffered_content: str) -> None:
        async with self._session_factory() as session:
            message = await session.get(Message, message_id)
            if message is None:
                return
            message.content = buffered_content
            message.status = "STREAMING"
            message.updated_at = _utcnow()
            await session.commit()

    async def complete_execution(
        self,
        execution_id: str,
        message_id: str,
        final_content: str,
        worker_id: str | None = None,
    ) -> bool:
        current_time = _utcnow()
        async with self._session_factory() as session:
            execution = await session.get(AIExecution, execution_id)
            if execution is not None:
                if execution.status == "CANCELLED":
                    return False
                if worker_id and execution.worker_id and execution.worker_id != worker_id:
                    return False
                execution.status = "COMPLETED"
                execution.worker_id = None
                execution.lease_expires_at = None
                execution.next_retry_at = None
                execution.completed_at = current_time
                execution.error = None
                execution.version += 1

            message = await session.get(Message, message_id)
            if message is not None:
                message.content = final_content
                message.status = "COMPLETED"
                message.updated_at = current_time
            await session.commit()
            return True

    async def fail_execution(
        self,
        execution_id: str,
        error: str,
        error_code: str = "EXECUTION_ERROR",
        worker_id: str | None = None,
    ) -> None:
        current_time = _utcnow()
        async with self._session_factory() as session:
            execution = await session.get(AIExecution, execution_id)
            if execution is None or execution.status in {"CANCELLED", "COMPLETED"}:
                return
            if worker_id and execution.worker_id and execution.worker_id != worker_id:
                return
            message = await session.get(Message, execution.message_id)
            if message is not None:
                message.status = "FAILED"
                message.updated_at = current_time
            execution.status = "FAILED"
            execution.worker_id = None
            execution.lease_expires_at = None
            execution.next_retry_at = None
            execution.completed_at = current_time
            execution.last_error_code = error_code[:64]
            execution.error = error[:4000]
            execution.version += 1
            await session.commit()

    async def cancel_execution(self, execution_id: str) -> AIExecution | None:
        current_time = _utcnow()
        async with self._session_factory() as session:
            execution = await session.get(AIExecution, execution_id)
            if execution is None:
                return None
            if execution.status in {"COMPLETED", "FAILED", "CANCELLED"}:
                return execution
            execution.status = "CANCELLED"
            execution.worker_id = None
            execution.lease_expires_at = None
            execution.next_retry_at = None
            execution.completed_at = current_time
            execution.error = None
            execution.version += 1
            message = await session.get(Message, execution.message_id)
            if message is not None and message.status not in {"COMPLETED", "FAILED"}:
                message.status = "CANCELLED"
                message.updated_at = current_time
            await session.commit()
            await session.refresh(execution)
            return execution

    async def get_execution_for_user(self, execution_id: str, user_id: str) -> AIExecution | None:
        async with self._session_factory() as session:
            stmt = select(AIExecution).where(
                AIExecution.request_id == execution_id,
                AIExecution.user_id == user_id,
            )
            return (await session.execute(stmt)).scalars().first()

    async def get_execution(self, execution_id: str) -> AIExecution | None:
        async with self._session_factory() as session:
            return await session.get(AIExecution, execution_id)

    async def get_message(self, message_id: str) -> Message | None:
        async with self._session_factory() as session:
            return await session.get(Message, message_id)

    async def list_chatrooms(self, user_id: str, page: int, size: int) -> tuple[list[ChatRoom], int]:
        offset = max(0, page) * max(1, size)
        limit = max(1, size)
        async with self._session_factory() as session:
            total_stmt = select(func.count()).select_from(ChatRoom).where(ChatRoom.user_id == user_id)
            total = int((await session.execute(total_stmt)).scalar_one())
            stmt = (
                select(ChatRoom)
                .where(ChatRoom.user_id == user_id)
                .order_by(desc(ChatRoom.updated_at))
                .offset(offset)
                .limit(limit)
            )
            rooms = list((await session.execute(stmt)).scalars().all())
            return rooms, total

    async def get_chatroom_for_user(self, user_id: str, chatroom_id: str) -> ChatRoom | None:
        async with self._session_factory() as session:
            stmt = select(ChatRoom).where(ChatRoom.id == chatroom_id, ChatRoom.user_id == user_id)
            return (await session.execute(stmt)).scalars().first()

    async def list_chatroom_messages(
        self,
        user_id: str,
        chatroom_id: str,
        page: int,
        size: int,
    ) -> tuple[list[Message], int]:
        room = await self.get_chatroom_for_user(user_id, chatroom_id)
        if room is None:
            raise PermissionError("Chatroom not found")

        offset = max(0, page) * max(1, size)
        limit = max(1, size)
        async with self._session_factory() as session:
            total_stmt = select(func.count()).select_from(Message).where(Message.chatroom_id == chatroom_id)
            total = int((await session.execute(total_stmt)).scalar_one())
            stmt = (
                select(Message)
                .where(Message.chatroom_id == chatroom_id)
                .order_by(Message.created_at.asc())
                .offset(offset)
                .limit(limit)
            )
            messages = list((await session.execute(stmt)).scalars().all())
            return messages, total

    async def list_all_chatroom_messages(self, user_id: str, chatroom_id: str) -> list[Message]:
        room = await self.get_chatroom_for_user(user_id, chatroom_id)
        if room is None:
            raise PermissionError("Chatroom not found")

        async with self._session_factory() as session:
            stmt = (
                select(Message)
                .where(Message.chatroom_id == chatroom_id)
                .order_by(Message.created_at.asc())
            )
            return list((await session.execute(stmt)).scalars().all())

    async def update_chatroom_title(self, user_id: str, chatroom_id: str, title: str) -> ChatRoom:
        normalized = (title or "").strip()
        if not normalized:
            raise ValueError("title is required")

        async with self._session_factory() as session:
            stmt = select(ChatRoom).where(ChatRoom.id == chatroom_id, ChatRoom.user_id == user_id)
            room = (await session.execute(stmt)).scalars().first()
            if room is None:
                raise PermissionError("Chatroom not found")
            room.title = normalized[:120]
            room.updated_at = _utcnow()
            await session.commit()
            await session.refresh(room)
            return room

    async def delete_chatroom(self, user_id: str, chatroom_id: str) -> None:
        room = await self.get_chatroom_for_user(user_id, chatroom_id)
        if room is None:
            raise PermissionError("Chatroom not found")
        async with self._session_factory() as session:
            await session.execute(delete(ChatRoom).where(ChatRoom.id == chatroom_id, ChatRoom.user_id == user_id))
            await session.commit()
