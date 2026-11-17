import asyncio

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models.ai_model import AIModel
from app.repositories.ai_model_repository import AIModelRepository
from app.repositories.user_key_repository import UserKeyRepository


async def _prepare_session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


async def _seed_model(session_factory):
    async with session_factory() as session:
        model = AIModel(
            model_name="gpt-4o",
            provider="openai",
            description="test",
            context_length=128000,
            supports_streaming=True,
            platform_key_available=True,
            active=True,
        )
        session.add(model)
        await session.commit()
        await session.refresh(model)
        return model.id


def test_api_key_crud():
    async def run():
        session_factory = await _prepare_session_factory()
        model_id = await _seed_model(session_factory)

        async with session_factory() as session:
            key_repo = UserKeyRepository(session)
            record = await key_repo.upsert("user-1", model_id, "encrypted-key-v1")
            assert record.model_id == model_id
            assert record.user_id == "user-1"

        async with session_factory() as session:
            key_repo = UserKeyRepository(session)
            found = await key_repo.get_active_key("user-1", model_id)
            assert found is not None
            assert found.encrypted_api_key == "encrypted-key-v1"

        async with session_factory() as session:
            key_repo = UserKeyRepository(session)
            await key_repo.upsert("user-1", model_id, "encrypted-key-v2")

        async with session_factory() as session:
            key_repo = UserKeyRepository(session)
            found = await key_repo.get_active_key("user-1", model_id)
            assert found is not None
            assert found.encrypted_api_key == "encrypted-key-v2"

        async with session_factory() as session:
            key_repo = UserKeyRepository(session)
            deleted = await key_repo.delete("user-1", model_id)
            assert deleted is True

        async with session_factory() as session:
            key_repo = UserKeyRepository(session)
            missing = await key_repo.get_active_key("user-1", model_id)
            assert missing is None

    asyncio.run(run())


def test_list_models_with_user_flag():
    async def run():
        session_factory = await _prepare_session_factory()
        model_id = await _seed_model(session_factory)

        async with session_factory() as session:
            key_repo = UserKeyRepository(session)
            await key_repo.upsert("user-42", model_id, "encrypted-key")

        async with session_factory() as session:
            model_repo = AIModelRepository(session)
            rows = await model_repo.list_active_with_user_key_flag("user-42")
            assert len(rows) == 1
            assert rows[0]["model_id"] == model_id
            assert rows[0]["user_key_configured"] is True

        async with session_factory() as session:
            model_repo = AIModelRepository(session)
            rows = await model_repo.list_active_with_user_key_flag("user-without-key")
            assert len(rows) == 1
            assert rows[0]["user_key_configured"] is False

    asyncio.run(run())
