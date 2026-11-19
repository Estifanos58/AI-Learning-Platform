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
from app.db.base import Base  # noqa: F401
from app.models.ai_execution import AIExecution  # noqa: F401
from app.models.ai_model import AIModel  # noqa: F401
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


async def ping_database() -> None:
    """Verify database connectivity."""
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))


async def init_database() -> None:
    """
    Verify PostgreSQL connectivity and that Alembic migrations have been applied.
    Schema changes are managed strictly by versioned Alembic migrations (`alembic upgrade head`).
    """
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
        if conn.dialect.name == "postgresql":
            result = await conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
            version = result.scalar_one_or_none()
            if not version:
                raise RuntimeError(
                    "Database schema is not migrated (alembic_version is empty). "
                    "Run 'alembic upgrade head' before starting rag-service."
                )
            log.info("Database verified at Alembic revision=%s", version)
        else:
            log.info("Database connectivity verified (dialect=%s)", conn.dialect.name)
