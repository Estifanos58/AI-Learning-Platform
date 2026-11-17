from __future__ import annotations

import uuid

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ModelEndpoint(Base):
    __tablename__ = "model_endpoints"
    __table_args__ = (
        UniqueConstraint("model_provider_id", "provider_account_id", name="uq_model_endpoint"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    model_provider_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("model_providers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("provider_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_used_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    health_status: Mapped[str] = mapped_column(String(20), nullable=False, default="healthy")
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
