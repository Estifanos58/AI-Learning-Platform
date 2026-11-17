from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import delete, desc, func, select

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
    async def resolve_or_create_chatroom(self, user_id: str, chatroom_id: str | None) -> ChatRoom:
        async with AsyncSessionLocal() as session:
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
        async with AsyncSessionLocal() as session:
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
        async with AsyncSessionLocal() as session:
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
    ) -> AIExecution:
        async with AsyncSessionLocal() as session:
            execution = AIExecution(
                request_id=request_id,
                chatroom_id=chatroom_id,
                message_id=message_id,
                user_id=user_id,
                stream_key=stream_key,
                status="PENDING",
                error=None,
            )
            session.add(execution)
            await session.commit()
            await session.refresh(execution)
            return execution

    async def mark_execution_running(self, execution_id: str) -> None:
        async with AsyncSessionLocal() as session:
            execution = await session.get(AIExecution, execution_id)
            if execution is None:
                return
            execution.status = "RUNNING"
            execution.error = None
            await session.commit()

    async def persist_assistant_partial(self, message_id: str, buffered_content: str) -> None:
        async with AsyncSessionLocal() as session:
            message = await session.get(Message, message_id)
            if message is None:
                return
            message.content = buffered_content
            message.status = "STREAMING"
            message.updated_at = _utcnow()
            await session.commit()

    async def complete_execution(self, execution_id: str, message_id: str, final_content: str) -> None:
        async with AsyncSessionLocal() as session:
            message = await session.get(Message, message_id)
            execution = await session.get(AIExecution, execution_id)
            if message is not None:
                message.content = final_content
                message.status = "COMPLETED"
                message.updated_at = _utcnow()
            if execution is not None:
                execution.status = "COMPLETED"
                execution.completed_at = _utcnow()
                execution.error = None
            await session.commit()

    async def fail_execution(self, execution_id: str, error: str) -> None:
        async with AsyncSessionLocal() as session:
            execution = await session.get(AIExecution, execution_id)
            if execution is None:
                return
            message = await session.get(Message, execution.message_id)
            if message is not None:
                message.status = "FAILED"
                message.updated_at = _utcnow()
            execution.status = "FAILED"
            execution.completed_at = _utcnow()
            execution.error = error[:4000]
            await session.commit()

    async def cancel_execution(self, execution_id: str) -> AIExecution | None:
        async with AsyncSessionLocal() as session:
            execution = await session.get(AIExecution, execution_id)
            if execution is None:
                return None
            execution.status = "CANCELLED"
            execution.completed_at = _utcnow()
            execution.error = None
            message = await session.get(Message, execution.message_id)
            if message is not None:
                message.status = "FAILED"
                message.updated_at = _utcnow()
            await session.commit()
            await session.refresh(execution)
            return execution

    async def get_execution_for_user(self, execution_id: str, user_id: str) -> AIExecution | None:
        async with AsyncSessionLocal() as session:
            stmt = select(AIExecution).where(
                AIExecution.request_id == execution_id,
                AIExecution.user_id == user_id,
            )
            return (await session.execute(stmt)).scalars().first()

    async def get_execution(self, execution_id: str) -> AIExecution | None:
        async with AsyncSessionLocal() as session:
            return await session.get(AIExecution, execution_id)

    async def get_message(self, message_id: str) -> Message | None:
        async with AsyncSessionLocal() as session:
            return await session.get(Message, message_id)

    async def list_chatrooms(self, user_id: str, page: int, size: int) -> tuple[list[ChatRoom], int]:
        offset = max(0, page) * max(1, size)
        limit = max(1, size)
        async with AsyncSessionLocal() as session:
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
        async with AsyncSessionLocal() as session:
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
        async with AsyncSessionLocal() as session:
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

        async with AsyncSessionLocal() as session:
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

        async with AsyncSessionLocal() as session:
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
        async with AsyncSessionLocal() as session:
            await session.execute(delete(ChatRoom).where(ChatRoom.id == chatroom_id, ChatRoom.user_id == user_id))
            await session.commit()
