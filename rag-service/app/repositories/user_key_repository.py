from __future__ import annotations

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_ai_api_key import UserAiApiKey


class UserKeyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_active_key(self, user_id: str, model_id: str) -> UserAiApiKey | None:
        stmt = select(UserAiApiKey).where(
            and_(
                UserAiApiKey.user_id == user_id,
                UserAiApiKey.model_id == model_id,
                UserAiApiKey.is_active.is_(True),
            )
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def upsert(self, user_id: str, model_id: str, encrypted_api_key: str) -> UserAiApiKey:
        record = await self.get_active_key(user_id=user_id, model_id=model_id)
        if record is None:
            record = UserAiApiKey(
                user_id=user_id,
                model_id=model_id,
                encrypted_api_key=encrypted_api_key,
                is_active=True,
            )
            self.session.add(record)
        else:
            record.encrypted_api_key = encrypted_api_key
            record.is_active = True

        await self.session.commit()
        await self.session.refresh(record)
        return record

    async def delete(self, user_id: str, model_id: str) -> bool:
        record = await self.get_active_key(user_id=user_id, model_id=model_id)
        if record is None:
            return False

        await self.session.delete(record)
        await self.session.commit()
        return True
