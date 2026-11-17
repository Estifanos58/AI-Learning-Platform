from __future__ import annotations

import logging
from typing import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings
from app.db.base import Base
from app.models.ai_model import AIModel  # noqa: F401
from app.models.ai_execution import AIExecution  # noqa: F401
from app.models.chat_room import ChatRoom  # noqa: F401
from app.models.message import Message  # noqa: F401
from app.models.model_definition import ModelDefinition  # noqa: F401
from app.models.model_endpoint import ModelEndpoint  # noqa: F401
from app.models.model_provider import ModelProvider  # noqa: F401
from app.models.provider_account import ProviderAccount  # noqa: F401

settings = get_settings()
log = logging.getLogger(__name__)

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session


async def ensure_ai_models_schema() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        if conn.dialect.name != "postgresql":
            return

        await conn.execute(
            text(
                """
                ALTER TABLE ai_models
                ADD COLUMN IF NOT EXISTS encrypted_platform_key TEXT
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE ai_models
                ADD COLUMN IF NOT EXISTS platform_key_available BOOLEAN NOT NULL DEFAULT FALSE
                """
            )
        )
        await conn.execute(
            text(
                """
                UPDATE ai_models
                SET platform_key_available = FALSE
                WHERE platform_key_available IS NULL
                """
            )
        )


async def init_database() -> None:
    await ensure_ai_models_schema()
    log.info("Database schema initialized")
