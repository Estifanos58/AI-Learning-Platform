from __future__ import annotations

import uuid

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AIModel(Base):
    __tablename__ = "ai_models"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    model_name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_length: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    supports_streaming: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    platform_key_available: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    encrypted_platform_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
