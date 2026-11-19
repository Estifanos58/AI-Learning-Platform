from __future__ import annotations

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AIExecution(Base):
    __tablename__ = "ai_executions"
    __table_args__ = (
        Index(
            "ix_ai_executions_claim_schedule",
            "status",
            "lease_expires_at",
            "next_retry_at",
        ),
    )

    request_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    chatroom_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("chat_rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    message_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    stream_key: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=3, server_default="3", nullable=False)
    worker_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    claimed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    heartbeat_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lease_expires_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_retry_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
