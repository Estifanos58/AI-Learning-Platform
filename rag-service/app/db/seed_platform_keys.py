"""Sync platform API keys from environment / settings into the ai_models table.

This module is idempotent — safe to call on every startup.  It reads the
platform keys from ``Settings``, encrypts them, and stores them on the
matching ``AIModel`` rows.  Models whose provider has no configured key
will have their platform key cleared.
"""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.ai_model import AIModel
from app.security.encryption import encrypt_key

log = logging.getLogger(__name__)


def _provider_key_map() -> dict[str, str | None]:
    """Return a mapping of provider name → raw API key (or *None*)."""
    settings = get_settings()
    return {
        "openai": settings.openai_api_key,
        "gemini": settings.gemini_api_key,
        "deepseek": settings.deepseek_api_key,
        "groq": settings.groq_api_key,
        "openrouter": settings.openrouter_api_key,
    }


async def sync_platform_keys(session: AsyncSession) -> None:
    """Encrypt and store platform API keys on every matching ``AIModel``."""
    key_map = _provider_key_map()

    result = await session.execute(select(AIModel))
    models = result.scalars().all()

    updated = 0
    for model in models:
        raw_key = key_map.get(model.provider)

        if raw_key:
            model.encrypted_platform_key = encrypt_key(raw_key)
            model.platform_key_available = True
            updated += 1
        else:
            model.encrypted_platform_key = None
            model.platform_key_available = False

    await session.commit()
    log.info("Platform keys synced: %d model(s) updated with platform keys", updated)
