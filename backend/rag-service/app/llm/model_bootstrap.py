"""Model Bootstrap – Automatically seeds default AI models, providers, and platform accounts.

Ensures Google Gemini and default platform models exist in the database with active
endpoints connected to platform environment keys (e.g. GEMINI_API_KEY).
If a user has not provided their own API key, they can seamlessly use these platform
default models.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy import select, and_, or_
from app.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.model_definition import ModelDefinition
from app.models.model_provider import ModelProvider
from app.models.provider_account import ProviderAccount
from app.models.model_endpoint import ModelEndpoint
from app.models.ai_model import AIModel
from app.security.encryption import encrypt_key

log = logging.getLogger(__name__)
settings = get_settings()

DEFAULT_MODELS: list[dict[str, Any]] = [
    {
        "model_name": "gemini-2.5-flash",
        "family": "gemini",
        "provider_name": "gemini",
        "provider_model_name": "gemini-2.5-flash",
        "context_length": 1048576,
        "capabilities": {
            "streaming": True,
            "platform_key_available": True,
            "is_default": True,
        },
        "description": "Google Gemini 2.5 Flash – High speed multimodal model with 1M context window (Platform Default).",
        "priority": 1,
    },
    {
        "model_name": "gemini-2.5-pro",
        "family": "gemini",
        "provider_name": "gemini",
        "provider_model_name": "gemini-2.5-pro",
        "context_length": 2097152,
        "capabilities": {
            "streaming": True,
            "reasoning": True,
            "platform_key_available": True,
            "is_default": True,
        },
        "description": "Google Gemini 2.5 Pro – Flagship reasoning model with 2M context window.",
        "priority": 1,
    },
    {
        "model_name": "gemini-1.5-flash",
        "family": "gemini",
        "provider_name": "gemini",
        "provider_model_name": "gemini-1.5-flash",
        "context_length": 1048576,
        "capabilities": {
            "streaming": True,
            "platform_key_available": True,
            "is_default": False,
        },
        "description": "Google Gemini 1.5 Flash – Fast multimodal model.",
        "priority": 2,
    },
    {
        "model_name": "gpt-4o-mini",
        "family": "openai",
        "provider_name": "openai",
        "provider_model_name": "gpt-4o-mini",
        "context_length": 128000,
        "capabilities": {
            "streaming": True,
            "platform_key_available": bool(settings.openai_api_key),
            "is_default": False,
        },
        "description": "OpenAI GPT-4o Mini – Fast and efficient model.",
        "priority": 1,
    },
]


async def bootstrap_default_models() -> None:
    """Idempotently bootstrap default AI models, providers, and platform accounts."""
    settings = get_settings()
    log.info("Bootstrapping default AI models and platform accounts...")
    async with AsyncSessionLocal() as session:
        try:
            # 1. Ensure platform accounts for available environment keys
            gemini_account: ProviderAccount | None = None
            if settings.gemini_api_key:
                stmt = select(ProviderAccount).where(
                    and_(
                        ProviderAccount.provider_name == "gemini",
                        ProviderAccount.account_label == "platform-gemini-default",
                    )
                )
                gemini_account = (await session.execute(stmt)).scalar_one_or_none()
                encrypted_key = encrypt_key(settings.gemini_api_key)
                if gemini_account is None:
                    gemini_account = ProviderAccount(
                        provider_name="gemini",
                        account_label="platform-gemini-default",
                        encrypted_api_key=encrypted_key,
                        rate_limit_per_minute=1000,
                        daily_quota=1000000,
                        is_active=True,
                        health_status="healthy",
                    )
                    session.add(gemini_account)
                    await session.flush()
                    log.info("Created platform ProviderAccount for Gemini")
                else:
                    gemini_account.encrypted_api_key = encrypted_key
                    gemini_account.is_active = True
                    gemini_account.health_status = "healthy"
                    await session.flush()

            openai_account: ProviderAccount | None = None
            if settings.openai_api_key:
                stmt = select(ProviderAccount).where(
                    and_(
                        ProviderAccount.provider_name == "openai",
                        ProviderAccount.account_label == "platform-openai-default",
                    )
                )
                openai_account = (await session.execute(stmt)).scalar_one_or_none()
                encrypted_key = encrypt_key(settings.openai_api_key)
                if openai_account is None:
                    openai_account = ProviderAccount(
                        provider_name="openai",
                        account_label="platform-openai-default",
                        encrypted_api_key=encrypted_key,
                        rate_limit_per_minute=1000,
                        daily_quota=1000000,
                        is_active=True,
                        health_status="healthy",
                    )
                    session.add(openai_account)
                    await session.flush()
                    log.info("Created platform ProviderAccount for OpenAI")
                else:
                    openai_account.encrypted_api_key = encrypted_key
                    openai_account.is_active = True
                    openai_account.health_status = "healthy"
                    await session.flush()

            # 2. Ensure each default model definition, provider attachment, and endpoint exists
            for def_info in DEFAULT_MODELS:
                model_name = def_info["model_name"]
                stmt = select(ModelDefinition).where(ModelDefinition.model_name == model_name)
                model_def = (await session.execute(stmt)).scalar_one_or_none()

                caps = dict(def_info["capabilities"])
                if def_info["family"] == "gemini":
                    caps["platform_key_available"] = bool(settings.gemini_api_key)
                elif def_info["family"] == "openai":
                    caps["platform_key_available"] = bool(settings.openai_api_key)

                if model_def is None:
                    model_def = ModelDefinition(
                        model_name=model_name,
                        family=def_info["family"],
                        context_length=def_info["context_length"],
                        capabilities=caps,
                        active=True,
                    )
                    session.add(model_def)
                    await session.flush()
                    log.info("Created ModelDefinition: %s", model_name)
                else:
                    # Update capabilities to reflect current key availability
                    model_def.capabilities = caps
                    model_def.active = True
                    await session.flush()

                # Ensure ModelProvider mapping exists
                provider_stmt = select(ModelProvider).where(
                    and_(
                        ModelProvider.model_definition_id == model_def.id,
                        ModelProvider.provider_name == def_info["provider_name"],
                        ModelProvider.provider_model_name == def_info["provider_model_name"],
                    )
                )
                provider = (await session.execute(provider_stmt)).scalar_one_or_none()
                if provider is None:
                    provider = ModelProvider(
                        model_definition_id=model_def.id,
                        provider_name=def_info["provider_name"],
                        provider_model_name=def_info["provider_model_name"],
                        priority=def_info["priority"],
                        active=True,
                    )
                    session.add(provider)
                    await session.flush()
                    log.info("Attached ModelProvider %s -> %s", def_info["provider_name"], model_name)
                else:
                    provider.active = True
                    await session.flush()

                # Connect platform endpoint if account exists
                target_account = gemini_account if def_info["provider_name"] == "gemini" else (
                    openai_account if def_info["provider_name"] == "openai" else None
                )
                if target_account is not None:
                    ep_stmt = select(ModelEndpoint).where(
                        and_(
                            ModelEndpoint.model_provider_id == provider.id,
                            ModelEndpoint.provider_account_id == target_account.id,
                        )
                    )
                    endpoint = (await session.execute(ep_stmt)).scalar_one_or_none()
                    if endpoint is None:
                        endpoint = ModelEndpoint(
                            model_provider_id=provider.id,
                            provider_account_id=target_account.id,
                            weight=1.0,
                            active=True,
                            health_status="healthy",
                        )
                        session.add(endpoint)
                        await session.flush()
                        log.info("Created ModelEndpoint for %s -> %s", model_name, target_account.account_label)
                    else:
                        endpoint.active = True
                        endpoint.health_status = "healthy"
                        await session.flush()

                # Also sync into ai_models table
                ai_stmt = select(AIModel).where(AIModel.model_name == model_name)
                ai_model = (await session.execute(ai_stmt)).scalar_one_or_none()
                if ai_model is None:
                    ai_model = AIModel(
                        id=model_def.id,
                        model_name=model_name,
                        provider=def_info["provider_name"],
                        description=def_info.get("description", ""),
                        context_length=def_info["context_length"],
                        supports_streaming=True,
                        platform_key_available=bool(caps.get("platform_key_available")),
                        active=True,
                    )
                    session.add(ai_model)
                    await session.flush()
                else:
                    ai_model.platform_key_available = bool(caps.get("platform_key_available"))
                    ai_model.active = True
                    await session.flush()

            await session.commit()
            log.info("AI models and platform accounts bootstrap complete")
        except Exception as exc:
            await session.rollback()
            log.error("Failed to bootstrap default AI models: %s", exc)
