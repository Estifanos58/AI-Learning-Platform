from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.provider_account import ProviderAccount

log = logging.getLogger(__name__)


class QuotaResetWorker:
    def __init__(self, interval_seconds: int = 300) -> None:
        self._interval_seconds = max(30, interval_seconds)
        self._task: asyncio.Task[None] | None = None
        self._running = False

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._running = False
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _run(self) -> None:
        while self._running:
            try:
                await self.run_once()
            except Exception as exc:  # noqa: BLE001
                log.warning("Quota reset worker cycle failed: %s", exc)
            await asyncio.sleep(self._interval_seconds)

    async def run_once(self) -> int:
        now = datetime.now(timezone.utc)
        reset_before = now - timedelta(hours=24)

        async with AsyncSessionLocal() as session:
            stmt = select(ProviderAccount).where(ProviderAccount.last_reset_at <= reset_before)
            accounts = list((await session.execute(stmt)).scalars().all())
            for account in accounts:
                account.used_today = 0
                account.last_reset_at = now
                if account.health_status == "throttled":
                    account.health_status = "healthy"

            if accounts:
                await session.commit()

        if accounts:
            log.info("Quota reset worker updated %d account(s)", len(accounts))
        return len(accounts)
