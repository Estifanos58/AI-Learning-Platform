from __future__ import annotations

from sqlalchemy import and_, case, literal, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_model import AIModel
from app.models.user_ai_api_key import UserAiApiKey


class AIModelRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, model_id: str) -> AIModel | None:
        return await self.session.get(AIModel, model_id)

    async def list_active_with_user_key_flag(self, user_id: str) -> list[dict[str, object]]:
        stmt = (
            select(
                AIModel.id,
                AIModel.model_name,
                AIModel.provider,
                AIModel.context_length,
                AIModel.supports_streaming,
                AIModel.description,
                AIModel.platform_key_available,
                case(
                    (UserAiApiKey.id.isnot(None), literal(True)),
                    else_=literal(False),
                ).label("user_key_configured"),
            )
            .outerjoin(
                UserAiApiKey,
                and_(
                    UserAiApiKey.model_id == AIModel.id,
                    UserAiApiKey.user_id == user_id,
                    UserAiApiKey.is_active.is_(True),
                ),
            )
            .where(AIModel.active.is_(True))
            .order_by(AIModel.provider.asc(), AIModel.model_name.asc())
        )
        rows = (await self.session.execute(stmt)).all()
        return [
            {
                "model_id": row.id,
                "model_name": row.model_name,
                "provider": row.provider,
                "context_length": row.context_length,
                "supports_streaming": row.supports_streaming,
                "description": row.description,
                "platform_key_available": row.platform_key_available,
                "user_key_configured": row.user_key_configured,
            }
            for row in rows
        ]
