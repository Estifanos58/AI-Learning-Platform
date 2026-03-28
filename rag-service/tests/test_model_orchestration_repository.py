import asyncio

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.repositories.model_orchestration_repository import (
    DuplicateModelDefinitionError,
    ModelOrchestrationRepository,
)


async def _prepare_session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


def test_create_model_definition_duplicate_name_raises_domain_error():
    async def run():
        session_factory = await _prepare_session_factory()

        async with session_factory() as session:
            repo = ModelOrchestrationRepository(session)
            first = await repo.create_model_definition(
                model_name="gemini-3.0",
                family="gemini",
                context_length=1000000,
                capabilities={"streaming": True, "multimodal": True},
                active=True,
            )
            assert first.model_name == "gemini-3.0"

        async with session_factory() as session:
            repo = ModelOrchestrationRepository(session)
            with pytest.raises(DuplicateModelDefinitionError):
                await repo.create_model_definition(
                    model_name="gemini-3.0",
                    family="gemini",
                    context_length=1000000,
                    capabilities={"streaming": True, "multimodal": True},
                    active=True,
                )

    asyncio.run(run())


def test_list_models_returns_provider_count_without_json_grouping_issues():
    async def run():
        session_factory = await _prepare_session_factory()

        async with session_factory() as session:
            repo = ModelOrchestrationRepository(session)
            model_one = await repo.create_model_definition(
                model_name="gemini-3.0",
                family="gemini",
                context_length=1000000,
                capabilities={"streaming": True, "multimodal": True},
                active=True,
            )
            await repo.create_model_definition(
                model_name="gpt-4.1-mini",
                family="gpt",
                context_length=128000,
                capabilities={"streaming": True},
                active=True,
            )
            await repo.attach_provider(
                model_definition_id=model_one.id,
                provider_name="gemini",
                provider_model_name="gemini-3.0",
                priority=1,
                active=True,
            )

        async with session_factory() as session:
            repo = ModelOrchestrationRepository(session)
            models = await repo.list_models()

        by_name = {item["model_name"]: item for item in models}
        assert by_name["gemini-3.0"]["provider_count"] == 1
        assert by_name["gpt-4.1-mini"]["provider_count"] == 0
        assert by_name["gemini-3.0"]["capabilities"] == {
            "streaming": True,
            "multimodal": True,
        }

    asyncio.run(run())
