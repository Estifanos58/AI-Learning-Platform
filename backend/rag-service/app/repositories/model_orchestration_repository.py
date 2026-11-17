from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.model_definition import ModelDefinition
from app.models.model_endpoint import ModelEndpoint
from app.models.model_provider import ModelProvider
from app.models.provider_account import ProviderAccount


@dataclass
class EndpointCandidate:
    endpoint_id: str
    provider_name: str
    provider_model_name: str
    api_key_encrypted: str
    account_id: str
    model_provider_id: str
    weight: float
    account_rate_limit_per_minute: int
    account_daily_quota: int
    account_used_today: int
    account_last_used_at: object | None
    account_last_reset_at: object
    account_health_status: str
    endpoint_health_status: str
    endpoint_last_used_at: object | None


class DuplicateModelDefinitionError(Exception):
    """Raised when creating a model definition with an existing model name."""


def _is_model_name_unique_violation(exc: IntegrityError) -> bool:
    text = str(exc).lower()
    return (
        "ix_model_definitions_model_name" in text
        or "model_definitions_model_name_key" in text
        or "unique constraint failed: model_definitions.model_name" in text
    )


class ModelOrchestrationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_model_definition(self, model_id: str) -> ModelDefinition | None:
        return await self.session.get(ModelDefinition, model_id)

    async def list_models(self) -> list[dict[str, object]]:
        provider_counts = (
            select(
                ModelProvider.model_definition_id.label("model_definition_id"),
                func.count(ModelProvider.id).label("provider_count"),
            )
            .group_by(ModelProvider.model_definition_id)
            .subquery()
        )

        stmt = (
            select(
                ModelDefinition.id,
                ModelDefinition.model_name,
                ModelDefinition.family,
                ModelDefinition.context_length,
                ModelDefinition.capabilities,
                ModelDefinition.active,
                func.coalesce(provider_counts.c.provider_count, 0).label("provider_count"),
            )
            .outerjoin(
                provider_counts,
                provider_counts.c.model_definition_id == ModelDefinition.id,
            )
            .order_by(ModelDefinition.model_name.asc())
        )
        rows = (await self.session.execute(stmt)).all()
        return [
            {
                "model_id": row.id,
                "model_name": row.model_name,
                "family": row.family,
                "context_length": row.context_length,
                "capabilities": row.capabilities or {},
                "active": row.active,
                "provider_count": int(row.provider_count or 0),
            }
            for row in rows
        ]

    async def create_model_definition(
        self,
        model_name: str,
        family: str,
        context_length: int,
        capabilities: dict[str, object],
        active: bool,
    ) -> ModelDefinition:
        exists_stmt = select(ModelDefinition.id).where(ModelDefinition.model_name == model_name)
        existing_id = (await self.session.execute(exists_stmt)).scalar_one_or_none()
        if existing_id is not None:
            raise DuplicateModelDefinitionError(f"Model name '{model_name}' already exists")

        model = ModelDefinition(
            model_name=model_name,
            family=family,
            context_length=context_length,
            capabilities=capabilities,
            active=active,
        )
        self.session.add(model)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            if _is_model_name_unique_violation(exc):
                raise DuplicateModelDefinitionError(
                    f"Model name '{model_name}' already exists"
                ) from exc
            raise
        await self.session.refresh(model)
        return model

    async def attach_provider(
        self,
        model_definition_id: str,
        provider_name: str,
        provider_model_name: str,
        priority: int,
        active: bool,
    ) -> ModelProvider:
        provider = ModelProvider(
            model_definition_id=model_definition_id,
            provider_name=provider_name,
            provider_model_name=provider_model_name,
            priority=priority,
            active=active,
        )
        self.session.add(provider)
        await self.session.commit()
        await self.session.refresh(provider)
        return provider

    async def create_provider_account(
        self,
        provider_name: str,
        account_label: str,
        encrypted_api_key: str,
        rate_limit_per_minute: int,
        daily_quota: int,
        is_active: bool,
    ) -> ProviderAccount:
        account = ProviderAccount(
            provider_name=provider_name,
            account_label=account_label,
            encrypted_api_key=encrypted_api_key,
            rate_limit_per_minute=rate_limit_per_minute,
            daily_quota=daily_quota,
            is_active=is_active,
            health_status="healthy",
        )
        self.session.add(account)
        await self.session.commit()
        await self.session.refresh(account)
        return account

    async def list_providers(self, model_id: Optional[str] = None) -> list[ModelProvider]:
        stmt = select(ModelProvider)
        if model_id:
            stmt = stmt.where(ModelProvider.model_definition_id == model_id)
        stmt = stmt.order_by(ModelProvider.priority.asc(), ModelProvider.provider_name.asc())
        return list((await self.session.execute(stmt)).scalars().all())

    async def list_accounts(self, provider_name: Optional[str] = None) -> list[ProviderAccount]:
        stmt = select(ProviderAccount)
        if provider_name:
            stmt = stmt.where(ProviderAccount.provider_name == provider_name)
        stmt = stmt.order_by(ProviderAccount.provider_name.asc(), ProviderAccount.account_label.asc())
        return list((await self.session.execute(stmt)).scalars().all())

    async def ensure_endpoints_for_provider(self, model_provider_id: str) -> int:
        provider = await self.session.get(ModelProvider, model_provider_id)
        if provider is None:
            return 0

        accounts_stmt = select(ProviderAccount).where(
            and_(
                ProviderAccount.provider_name == provider.provider_name,
                ProviderAccount.is_active.is_(True),
            )
        )
        accounts = list((await self.session.execute(accounts_stmt)).scalars().all())
        created = 0

        for account in accounts:
            exists_stmt = select(ModelEndpoint.id).where(
                and_(
                    ModelEndpoint.model_provider_id == provider.id,
                    ModelEndpoint.provider_account_id == account.id,
                )
            )
            exists_id = (await self.session.execute(exists_stmt)).scalar_one_or_none()
            if exists_id is not None:
                continue

            endpoint = ModelEndpoint(
                model_provider_id=provider.id,
                provider_account_id=account.id,
                weight=1.0,
                active=True,
                health_status="healthy",
            )
            self.session.add(endpoint)
            created += 1

        if created:
            await self.session.commit()
        return created

    async def list_endpoint_candidates(self, model_id: str) -> list[EndpointCandidate]:
        stmt = (
            select(
                ModelEndpoint.id,
                ModelProvider.provider_name,
                ModelProvider.provider_model_name,
                ProviderAccount.encrypted_api_key,
                ProviderAccount.id.label("account_id"),
                ModelProvider.id.label("model_provider_id"),
                ModelEndpoint.weight,
                ProviderAccount.rate_limit_per_minute,
                ProviderAccount.daily_quota,
                ProviderAccount.used_today,
                ProviderAccount.last_used_at,
                ProviderAccount.last_reset_at,
                ProviderAccount.health_status.label("account_health_status"),
                ModelEndpoint.health_status.label("endpoint_health_status"),
                ModelEndpoint.last_used_at.label("endpoint_last_used_at"),
            )
            .join(ModelProvider, ModelProvider.id == ModelEndpoint.model_provider_id)
            .join(ProviderAccount, ProviderAccount.id == ModelEndpoint.provider_account_id)
            .join(ModelDefinition, ModelDefinition.id == ModelProvider.model_definition_id)
            .where(
                and_(
                    ModelDefinition.id == model_id,
                    ModelDefinition.active.is_(True),
                    ModelProvider.active.is_(True),
                    ModelEndpoint.active.is_(True),
                    ProviderAccount.is_active.is_(True),
                )
            )
            .order_by(ModelProvider.priority.asc())
        )
        rows = (await self.session.execute(stmt)).all()
        return [
            EndpointCandidate(
                endpoint_id=row.id,
                provider_name=row.provider_name,
                provider_model_name=row.provider_model_name,
                api_key_encrypted=row.encrypted_api_key,
                account_id=row.account_id,
                model_provider_id=row.model_provider_id,
                weight=float(row.weight or 0.0),
                account_rate_limit_per_minute=int(row.rate_limit_per_minute or 0),
                account_daily_quota=int(row.daily_quota or 0),
                account_used_today=int(row.used_today or 0),
                account_last_used_at=row.last_used_at,
                account_last_reset_at=row.last_reset_at,
                account_health_status=row.account_health_status,
                endpoint_health_status=row.endpoint_health_status,
                endpoint_last_used_at=row.endpoint_last_used_at,
            )
            for row in rows
        ]
