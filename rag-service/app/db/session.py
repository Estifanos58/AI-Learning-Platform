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
            "model_name": settings.openai_model,
            "provider": "openai",
            "description": f"OpenAI {settings.openai_model}",
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
            "model_name": settings.gemini_model,
            "provider": "gemini",
            "description": f"Google {settings.gemini_model}",
            "context_length": 2000000,
            "supports_streaming": True,
            "platform_key_available": bool(settings.gemini_api_key),
            "active": True,
        },
        {
            "model_name": settings.deepseek_model,
            "provider": "deepseek",
            "description": f"DeepSeek {settings.deepseek_model}",
            "context_length": 64000,
            "supports_streaming": True,
            "platform_key_available": bool(settings.deepseek_api_key),
            "active": True,
        },
        {
            "model_name": settings.groq_model,
            "provider": "groq",
            "description": f"Groq {settings.groq_model}",
            "context_length": 131072,
            "supports_streaming": True,
            "platform_key_available": bool(settings.groq_api_key),
            "active": True,
        },
        {
            "model_name": settings.openrouter_model,
            "provider": "openrouter",
            "description": f"OpenRouter {settings.openrouter_model}",
            "context_length": 128000,
            "supports_streaming": True,
            "platform_key_available": bool(settings.openrouter_api_key),
            "active": True,
        },
        {
            "model_name": settings.local_llm_model,
            "provider": "local",
            "description": f"Local model {settings.local_llm_model}",
            "context_length": 32000,
            "supports_streaming": True,
            "platform_key_available": bool(settings.local_llm_url),
            "active": True,
        },
    ]


async def seed_default_ai_models(session: AsyncSession) -> None:
    default_models = _default_models()
    deduped: list[dict[str, object]] = []
    seen_names: set[str] = set()
    for item in default_models:
        model_name = str(item["model_name"])
        if model_name in seen_names:
            continue
        seen_names.add(model_name)
        deduped.append(item)

    names = [item["model_name"] for item in deduped]

    result = await session.execute(select(AIModel).where(AIModel.model_name.in_(names)))
    existing_by_name = {model.model_name: model for model in result.scalars().all()}

    inserted = 0
    updated = 0
    for item in deduped:
        model_name = item["model_name"]
        existing = existing_by_name.get(model_name)
        if existing is None:
            session.add(AIModel(**item))
            inserted += 1
            continue

        changed = False
        for field in (
            "provider",
            "description",
            "context_length",
            "supports_streaming",
            "platform_key_available",
            "active",
        ):
            new_value = item[field]
            if getattr(existing, field) != new_value:
                setattr(existing, field, new_value)
                changed = True

        if changed:
            updated += 1

    if inserted or updated:
        await session.commit()
        log.info("Default AI models upserted: inserted=%d updated=%d", inserted, updated)


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
