"""Tests for model_bootstrap module."""

from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import get_settings
from app.db.base import Base
from app.llm.model_bootstrap import bootstrap_default_models
from app.models.model_definition import ModelDefinition
from app.models.model_provider import ModelProvider
from app.models.provider_account import ProviderAccount
from app.models.model_endpoint import ModelEndpoint


@pytest.mark.asyncio
async def test_bootstrap_default_models(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("AI_KEY_ENCRYPTION_SECRET", "bootstrap-test-secret-32-chars-long!")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key-123456")
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key-abcdef")
    get_settings.cache_clear()

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr("app.llm.model_bootstrap.AsyncSessionLocal", session_factory)

    # First bootstrap run
    await bootstrap_default_models()

    async with session_factory() as session:
        models = (await session.execute(select(ModelDefinition))).scalars().all()
        model_names = {m.model_name for m in models}
        assert "gemini-2.5-flash" in model_names
        assert "gemini-2.5-pro" in model_names
        assert "gpt-4o-mini" in model_names

        accounts = (await session.execute(select(ProviderAccount))).scalars().all()
        account_labels = {a.account_label for a in accounts}
        assert "platform-gemini-default" in account_labels
        assert "platform-openai-default" in account_labels

        endpoints = (await session.execute(select(ModelEndpoint))).scalars().all()
        assert len(endpoints) >= 3

    # Idempotent second run
    await bootstrap_default_models()

    async with session_factory() as session:
        models2 = (await session.execute(select(ModelDefinition))).scalars().all()
        assert len(models2) == len(models)
