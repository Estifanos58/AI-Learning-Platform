"""Integration tests for ModelOrchestrationRepository with encrypted provider accounts."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import get_settings
from app.db.base import Base
from app.repositories.model_orchestration_repository import ModelOrchestrationRepository
from app.security.encryption import decrypt_key, encrypt_key


async def _prepare_session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine, async_sessionmaker(engine, expire_on_commit=False)


@pytest.mark.asyncio
async def test_provider_account_and_endpoint_creation_with_encrypted_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("AI_KEY_ENCRYPTION_SECRET", "integration-test-secret-32-chars-minimum!!")
    get_settings.cache_clear()

    engine, session_factory = await _prepare_session_factory()
    try:
        async with session_factory() as session:
            repo = ModelOrchestrationRepository(session)
            model = await repo.create_model_definition(
                model_name="gpt-4o-mini",
                family="openai",
                context_length=128000,
                capabilities={"streaming": True},
                active=True,
            )
            await repo.attach_provider(
                model_definition_id=model.id,
                provider_name="openai",
                provider_model_name="gpt-4o-mini",
                priority=10,
                active=True,
            )
            encrypted = encrypt_key("sk-live-secret-999")
            account = await repo.create_provider_account(
                provider_name="openai",
                account_label="primary-pool",
                encrypted_api_key=encrypted,
                rate_limit_per_minute=60,
                daily_quota=100000,
                is_active=True,
            )
            assert account.encrypted_api_key != "sk-live-secret-999"
            assert decrypt_key(account.encrypted_api_key) == "sk-live-secret-999"

            accounts = await repo.list_accounts(provider_name="openai")
            assert len(accounts) == 1
            assert accounts[0].account_label == "primary-pool"
    finally:
        await engine.dispose()
