from __future__ import annotations

import logging
from typing import AsyncIterator

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings
from app.db.base import Base
from app.models.ai_model import AIModel
from app.models.user_ai_api_key import UserAiApiKey  # noqa: F401
from app.db.seed_platform_keys import sync_platform_keys

settings = get_settings()
log = logging.getLogger(__name__)

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session


def _default_models() -> list[dict[str, object]]:
    return [
        {
            "model_name": "gpt-4o",
            "provider": "openai",
            "description": "OpenAI GPT-4o",
            "context_length": 128000,
            "supports_streaming": True,
            "platform_key_available": bool(settings.openai_api_key),
            "active": True,
        },
        {
            "model_name": "gpt-4o-mini",
            "provider": "openai",
            "description": "OpenAI GPT-4o-mini",
            "context_length": 128000,
            "supports_streaming": True,
            "platform_key_available": bool(settings.openai_api_key),
            "active": True,
        },
        {
            "model_name": "gemini-1.5-pro",
            "provider": "gemini",
            "description": "Google Gemini 1.5 Pro",
            "context_length": 2000000,
            "supports_streaming": True,
            "platform_key_available": bool(settings.gemini_api_key),
            "active": True,
        },
        {
            "model_name": "deepseek-chat",
            "provider": "deepseek",
            "description": "DeepSeek Chat",
            "context_length": 64000,
            "supports_streaming": True,
            "platform_key_available": bool(settings.deepseek_api_key),
            "active": True,
        },
        {
            "model_name": "local-llama",
            "provider": "local",
            "description": "Local Llama-compatible model",
            "context_length": 32000,
            "supports_streaming": True,
            "platform_key_available": bool(settings.local_llm_url),
            "active": True,
        },
    ]


async def seed_default_ai_models(session: AsyncSession) -> None:
    existing = await session.execute(select(AIModel.id).limit(1))
    if existing.first() is not None:
        return

    for item in _default_models():
        session.add(AIModel(**item))

    await session.commit()
    log.info("Seeded default AI models")


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

    async with AsyncSessionLocal() as session:
        await seed_default_ai_models(session)
        await sync_platform_keys(session)
