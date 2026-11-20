from __future__ import annotations

from dataclasses import dataclass

from app.config import get_settings
from app.db.session import AsyncSessionLocal
from app.llm.account_pool_manager import AccountPoolManager
from app.llm.endpoint_selector import EndpointSelector, SelectedEndpoint
from app.models.provider_account import ProviderAccount
from app.repositories.model_orchestration_repository import ModelOrchestrationRepository
from app.security.encryption import decrypt_key


@dataclass
class EndpointSelection:
    endpoint_id: str
    account_id: str
    provider_name: str
    provider_model_name: str
    api_key: str
    score: float


class ModelOrchestrator:
    def __init__(self) -> None:
        self._selector = EndpointSelector()
        self._account_pool = AccountPoolManager()

    async def select_endpoint(self, model_id: str) -> EndpointSelection | None:
        if not model_id:
            return None

        async with AsyncSessionLocal() as session:
            repo = ModelOrchestrationRepository(session)
            candidates = await repo.list_endpoint_candidates(model_id)
            selected = self._selector.select_best(candidates)
            if selected is None:
                return None

            account = await session.get(ProviderAccount, selected.account_id)
            if account is None or not self._account_pool.can_use_account(account):
                settings = get_settings()
                normalized_id = (model_id or "").lower()
                if settings.gemini_api_key and ("gemini" in normalized_id or normalized_id in ("gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-2.0-flash")):
                    provider_model = model_id if model_id.startswith("gemini-") else "gemini-2.5-flash"
                    return EndpointSelection(
                        endpoint_id="platform-gemini-default",
                        account_id="platform-gemini-default",
                        provider_name="gemini",
                        provider_model_name=provider_model,
                        api_key=settings.gemini_api_key,
                        score=100.0,
                    )
                return None

            return self._to_selection(selected)

    async def select_endpoints(self, model_id: str, limit: int = 3) -> list[EndpointSelection]:
        if not model_id:
            return []

        async with AsyncSessionLocal() as session:
            repo = ModelOrchestrationRepository(session)
            candidates = await repo.list_endpoint_candidates(model_id)
            picks: list[EndpointSelection] = []
            remaining = candidates[:]

            while remaining and len(picks) < max(1, limit):
                selected = self._selector.select_best(remaining)
                if selected is None:
                    break

                account = await session.get(ProviderAccount, selected.account_id)
                if account is not None and await self._account_pool.can_use_account_async(account):
                    picks.append(self._to_selection(selected))

                remaining = [item for item in remaining if item.endpoint_id != selected.endpoint_id]

            if not picks:
                settings = get_settings()
                normalized_id = (model_id or "").lower()
                if settings.gemini_api_key and ("gemini" in normalized_id or normalized_id in ("gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-2.0-flash")):
                    provider_model = model_id if model_id.startswith("gemini-") else "gemini-2.5-flash"
                    picks.append(
                        EndpointSelection(
                            endpoint_id="platform-gemini-default",
                            account_id="platform-gemini-default",
                            provider_name="gemini",
                            provider_model_name=provider_model,
                            api_key=settings.gemini_api_key,
                            score=100.0,
                        )
                    )
                elif settings.openai_api_key and ("gpt" in normalized_id or "openai" in normalized_id):
                    provider_model = model_id if model_id.startswith("gpt-") else "gpt-4o-mini"
                    picks.append(
                        EndpointSelection(
                            endpoint_id="platform-openai-default",
                            account_id="platform-openai-default",
                            provider_name="openai",
                            provider_model_name=provider_model,
                            api_key=settings.openai_api_key,
                            score=100.0,
                        )
                    )

            return picks

    def _to_selection(self, selected: SelectedEndpoint) -> EndpointSelection:
        return EndpointSelection(
            endpoint_id=selected.endpoint_id,
            account_id=selected.account_id,
            provider_name=selected.provider_name,
            provider_model_name=selected.provider_model_name,
            api_key=decrypt_key(selected.api_key_encrypted),
            score=selected.score,
        )
