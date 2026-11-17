from __future__ import annotations

import uuid

from sqlalchemy import Boolean, DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProviderAccount(Base):
    __tablename__ = "provider_accounts"
    __table_args__ = (
        UniqueConstraint("provider_name", "account_label", name="uq_provider_account_label"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    provider_name: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    account_label: Mapped[str] = mapped_column(String(120), nullable=False)
    encrypted_api_key: Mapped[str] = mapped_column(Text, nullable=False)
    rate_limit_per_minute: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    daily_quota: Mapped[int] = mapped_column(Integer, nullable=False, default=200000)
    used_today: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_used_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_reset_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    health_status: Mapped[str] = mapped_column(String(20), nullable=False, default="healthy")
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
