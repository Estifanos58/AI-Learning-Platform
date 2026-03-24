"""Orchestration – pipeline executor: orchestrates the full RAG pipeline."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from typing import Any, Dict, Optional, Set

from app.agents.base_agent import AgentContext
from app.db.session import AsyncSessionLocal
from app.repositories.ai_model_repository import AIModelRepository
from app.repositories.user_key_repository import UserKeyRepository
from app.orchestration.planner_agent import PlannerAgent
from app.orchestration.response_aggregator import ResponseAggregator
from app.orchestration.workflow_builder import WorkflowBuilder
from app.retrieval.reranker import Reranker
from app.retrieval.vector_search import VectorSearch
from app.security.encryption import decrypt_key
from app.security.user_permission_checker import UserPermissionChecker
from app.streaming.response_streamer import ResponseStreamer
from app.usage.token_meter import TokenMeter

log = logging.getLogger(__name__)

# In-process cancellation registry (request_id → Event)
_CANCELLATION_REGISTRY: Dict[str, asyncio.Event] = {}


class PipelineExecutor:
    """
    End-to-end RAG pipeline:
      1. Authorize file IDs via file-service gRPC
      2. Vector search + rerank
      3. Plan agent workflow
      4. Execute agents
      5. Aggregate + stream response chunks to Kafka
      6. Record usage
    """

    def __init__(self) -> None:
        self._search = VectorSearch()
        self._reranker = Reranker()
        self._planner = PlannerAgent()
        self._builder = WorkflowBuilder()
        self._aggregator = ResponseAggregator()
        self._streamer = ResponseStreamer()
        self._perm_checker = UserPermissionChecker()
        self._meter = TokenMeter()

    async def execute(self, payload: Dict[str, Any]) -> None:
        request_id = payload.get("message_id") or payload.get("messageId") or str(uuid.uuid4())
        chatroom_id = payload.get("chatroom_id") or payload.get("chatroomId", "")
        user_id = payload.get("user_id") or payload.get("userId", "")
        model_id = payload.get("ai_model_id") or payload.get("aiModelId", "")
        model_name_hint = payload.get("model_name") or payload.get("modelName")
        provider_hint = payload.get("provider") or payload.get("providerName")
        question = payload.get("content", "")
        file_ids = payload.get("file_ids", [])
        options = payload.get("options", {})
        context_window = payload.get("context_window", [])
        model_info = await self._resolve_model_info(model_id=model_id)
        if model_id and not model_info.get("found"):
            raise RuntimeError(
                f"Requested ai_model_id '{model_id}' was not found in ai_models table."
            )
        user_api_key = await self._resolve_user_api_key(user_id=user_id, model_id=model_id)

        # Register cancellation event
        cancel_event = asyncio.Event()
        _CANCELLATION_REGISTRY[request_id] = cancel_event

        start_ts = time.monotonic()
        try:
            await self._run_pipeline(
                request_id=request_id,
                chatroom_id=chatroom_id,
                user_id=user_id,
                model_id=model_id,
                model_name=model_info.get("model_name") or model_name_hint or model_id,
                provider_name=model_info.get("provider") or provider_hint,
                question=question,
                file_ids=file_ids,
                options=options,
                context_window=context_window,
                user_api_key=user_api_key,
                cancel_event=cancel_event,
            )
        except asyncio.CancelledError:
            await self._streamer.publish_cancelled(
                chatroom_id=chatroom_id,
                message_id=request_id,
                request_id=request_id,
            )
        except Exception as exc:  # noqa: BLE001
            log.error("Pipeline failed for request_id=%s: %s", request_id, exc)
            await self._streamer.publish_failed(
                chatroom_id=chatroom_id,
                message_id=request_id,
                request_id=request_id,
                error=str(exc),
            )
        finally:
            _CANCELLATION_REGISTRY.pop(request_id, None)
            latency_ms = int((time.monotonic() - start_ts) * 1000)
            log.info(
                "Pipeline complete: request_id=%s latency_ms=%d", request_id, latency_ms
            )

    async def _resolve_user_api_key(self, user_id: str, model_id: str) -> Optional[str]:
        if not user_id or not model_id:
            return None

        try:
            async with AsyncSessionLocal() as session:
                repo = UserKeyRepository(session)
                record = await repo.get_active_key(user_id=user_id, model_id=model_id)
                if record is None:
                    return None
                return decrypt_key(record.encrypted_api_key)
        except Exception as exc:  # noqa: BLE001
            log.warning("Failed to resolve user API key for user_id=%s model_id=%s: %s", user_id, model_id, exc)
            return None

    async def _resolve_model_info(self, model_id: str) -> Dict[str, Optional[str] | bool]:
        if not model_id:
            return {"model_name": None, "provider": None, "found": False}

        try:
            async with AsyncSessionLocal() as session:
                repo = AIModelRepository(session)
                model = await repo.get_by_id(model_id)
                if model is None:
                    return {"model_name": None, "provider": None, "found": False}
                return {
                    "model_name": model.model_name,
                    "provider": model.provider,
                    "found": True,
                }
        except Exception as exc:  # noqa: BLE001
            log.warning("Failed to resolve model metadata for model_id=%s: %s", model_id, exc)
            return {"model_name": None, "provider": None, "found": False}

    async def _run_pipeline(
        self,
        request_id: str,
        chatroom_id: str,
        user_id: str,
        model_id: str,
        model_name: str,
        provider_name: Optional[str],
        question: str,
        file_ids: list,
        options: Dict[str, Any],
        context_window: list,
        user_api_key: Optional[str],
        cancel_event: asyncio.Event,
    ) -> None:
        self._check_cancel(cancel_event)

        # 1-2. Authorize file IDs + vector search + rerank (only when files attached)
        chunks = []
        if file_ids:
            allowed_file_ids = await self._perm_checker.get_allowed_file_ids(
                user_id=user_id, file_ids=file_ids
            )
            self._check_cancel(cancel_event)

            raw_chunks = await self._search.search(question, allowed_file_ids)
            self._check_cancel(cancel_event)
            chunks = await self._reranker.rerank(question, raw_chunks)
            self._check_cancel(cancel_event)
        else:
            log.info(
                "No file_ids attached for request_id=%s; skipping vector search",
                request_id,
            )

        # 3. Plan
        ctx_summary = " ".join(
            c.get("payload", {}).get("chunk_text", "")[:200] for c in chunks[:3]
        )
        plan = await self._planner.plan(
            question=question,
            context_summary=ctx_summary,
            model_id=model_id,
            model_name=model_name,
            provider_name=provider_name,
            user_api_key=user_api_key,
            options={**options, "context_window": context_window},
        )
        agents = self._builder.build(plan)
        self._check_cancel(cancel_event)

        # 4. Execute agents (sequential with cancel checks)
        agent_ctx = AgentContext(
            request_id=request_id,
            user_id=user_id,
            question=question,
            chunks=chunks,
            model_id=model_id,
            model_name=model_name,
            provider_name=provider_name,
            user_api_key=user_api_key,
            options={**options, "context_window": context_window},
        )

        results = []
        for agent in agents:
            self._check_cancel(cancel_event)
            result = await agent.run(agent_ctx)
            results.append(result)

        # 5. Aggregate
        aggregated = self._aggregator.aggregate(results)
        self._check_cancel(cancel_event)
        full_text = aggregated["content"]
        citations = aggregated["citations"]
        chunk_size = 200
        seq = 0

        for i in range(0, len(full_text), chunk_size):
            self._check_cancel(cancel_event)
            delta = full_text[i : i + chunk_size]
            await self._streamer.publish_chunk(
                chatroom_id=chatroom_id,
                message_id=request_id,
                request_id=request_id,
                sequence=seq,
                content_delta=delta,
                citations=citations if i == 0 else [],
                done=False,
            )
            seq += 1

        # 7. Publish completion
        usage = await self._meter.estimate(question, full_text, model_name or model_id)
        await self._streamer.publish_completed(
            chatroom_id=chatroom_id,
            message_id=request_id,
            request_id=request_id,
            final_content=full_text,
            citations=citations,
            usage=usage,
            model_used=model_name or model_id,
        )

    @staticmethod
    def cancel(request_id: str) -> None:
        event = _CANCELLATION_REGISTRY.get(request_id)
        if event:
            event.set()
            log.info("Cancellation signal set for request_id=%s", request_id)

    @staticmethod
    def _check_cancel(event: asyncio.Event) -> None:
        if event.is_set():
            raise asyncio.CancelledError("Pipeline cancelled by user request")
