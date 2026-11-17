"""Orchestration – pipeline executor: orchestrates the full RAG pipeline."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from typing import Any, Awaitable, Callable, Dict

from app.agents.base_agent import AgentContext
from app.llm.model_orchestrator import EndpointSelection, ModelOrchestrator
from app.orchestration.planner_agent import PlannerAgent
from app.orchestration.response_aggregator import ResponseAggregator
from app.orchestration.workflow_builder import WorkflowBuilder
from app.retrieval.reranker import Reranker
from app.retrieval.vector_search import VectorSearch
from app.security.user_permission_checker import UserPermissionChecker
from app.streaming.response_streamer import ResponseStreamer
from app.usage.token_meter import TokenMeter

log = logging.getLogger(__name__)

# In-process cancellation registry (request_id → Event)
_CANCELLATION_REGISTRY: Dict[str, asyncio.Event] = {}

PartialPersistHook = Callable[[str, str], Awaitable[None]]
CompletionHook = Callable[[str, str, str], Awaitable[None]]
FailureHook = Callable[[str, str], Awaitable[None]]
CancelledHook = Callable[[str], Awaitable[None]]
CancelledProbe = Callable[[str], Awaitable[bool]]


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
        self._orchestrator = ModelOrchestrator()
        self._perm_checker = UserPermissionChecker()
        self._meter = TokenMeter()

    async def execute(self, payload: Dict[str, Any]) -> None:
        request_id = (
            payload.get("request_id")
            or payload.get("requestId")
            or payload.get("message_id")
            or payload.get("messageId")
            or str(uuid.uuid4())
        )
        message_id = payload.get("message_id") or payload.get("messageId") or request_id
        chatroom_id = payload.get("chatroom_id") or payload.get("chatroomId", "")
        user_id = payload.get("user_id") or payload.get("userId", "")
        model_id = payload.get("ai_model_id") or payload.get("aiModelId", "")
        question = payload.get("content", "")
        file_ids = payload.get("file_ids", [])
        options = payload.get("options", {})
        context_window = payload.get("context_window", [])
        max_retries = int(options.get("max_endpoint_retries", 3))
        on_partial_persist: PartialPersistHook | None = payload.get("on_partial_persist")
        on_completed: CompletionHook | None = payload.get("on_completed")
        on_failed: FailureHook | None = payload.get("on_failed")
        on_cancelled: CancelledHook | None = payload.get("on_cancelled")
        is_cancelled: CancelledProbe | None = payload.get("is_cancelled")
        if not model_id:
            raise RuntimeError("ai_model_id is required")

        candidate_endpoints = await self._orchestrator.select_endpoints(
            model_id=model_id,
            limit=max_retries,
        )
        if not candidate_endpoints:
            raise RuntimeError(
                f"No active endpoints available for ai_model_id '{model_id}'"
            )

        # Register cancellation event
        cancel_event = asyncio.Event()
        _CANCELLATION_REGISTRY[request_id] = cancel_event

        start_ts = time.monotonic()
        try:
            await self._run_pipeline(
                request_id=request_id,
                message_id=message_id,
                chatroom_id=chatroom_id,
                user_id=user_id,
                model_id=model_id,
                question=question,
                file_ids=file_ids,
                options=options,
                context_window=context_window,
                candidate_endpoints=candidate_endpoints,
                max_retries=max_retries,
                cancel_event=cancel_event,
                on_partial_persist=on_partial_persist,
                on_completed=on_completed,
                on_failed=on_failed,
                is_cancelled=is_cancelled,
            )
        except asyncio.CancelledError:
            await self._streamer.publish_cancelled(
                chatroom_id=chatroom_id,
                message_id=message_id,
                request_id=request_id,
            )
            if on_cancelled is not None:
                await on_cancelled(request_id)
        except Exception as exc:  # noqa: BLE001
            log.error("Pipeline failed for request_id=%s: %s", request_id, exc)
            await self._streamer.publish_failed(
                chatroom_id=chatroom_id,
                message_id=message_id,
                request_id=request_id,
                error=str(exc),
            )
            if on_failed is not None:
                await on_failed(request_id, str(exc))
        finally:
            _CANCELLATION_REGISTRY.pop(request_id, None)
            latency_ms = int((time.monotonic() - start_ts) * 1000)
            log.info(
                "Pipeline complete: request_id=%s latency_ms=%d", request_id, latency_ms
            )

    async def _run_pipeline(
        self,
        request_id: str,
        message_id: str,
        chatroom_id: str,
        user_id: str,
        model_id: str,
        question: str,
        file_ids: list,
        options: Dict[str, Any],
        context_window: list,
        candidate_endpoints: list[EndpointSelection],
        max_retries: int,
        cancel_event: asyncio.Event,
        on_partial_persist: PartialPersistHook | None,
        on_completed: CompletionHook | None,
        on_failed: FailureHook | None,
        is_cancelled: CancelledProbe | None,
    ) -> None:
        await self._check_cancel(cancel_event, request_id, is_cancelled)

        # 1-2. Authorize file IDs + vector search + rerank (only when files attached)
        chunks = []
        if file_ids:
            allowed_file_ids = await self._perm_checker.get_allowed_file_ids(
                user_id=user_id, file_ids=file_ids
            )
            await self._check_cancel(cancel_event, request_id, is_cancelled)

            raw_chunks = await self._search.search(question, allowed_file_ids)
            await self._check_cancel(cancel_event, request_id, is_cancelled)
            chunks = await self._reranker.rerank(question, raw_chunks)
            await self._check_cancel(cancel_event, request_id, is_cancelled)
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
            provider_name=candidate_endpoints[0].provider_name,
            provider_model_name=candidate_endpoints[0].provider_model_name,
            api_key=candidate_endpoints[0].api_key,
            endpoint_id=candidate_endpoints[0].endpoint_id,
            account_id=candidate_endpoints[0].account_id,
            options={**options, "context_window": context_window},
        )
        agents = self._builder.build(plan)
        await self._check_cancel(cancel_event, request_id, is_cancelled)

        # 4. Execute agents (sequential with endpoint retries)
        results = []
        for agent in agents:
            await self._check_cancel(cancel_event, request_id, is_cancelled)
            agent_result = None
            last_exc: Exception | None = None

            for endpoint in candidate_endpoints[: max(1, max_retries)]:
                agent_ctx = AgentContext(
                    request_id=request_id,
                    user_id=user_id,
                    question=question,
                    chunks=chunks,
                    model_id=model_id,
                    model_name=endpoint.provider_model_name,
                    provider_name=endpoint.provider_name,
                    provider_model_name=endpoint.provider_model_name,
                    api_key=endpoint.api_key,
                    endpoint_id=endpoint.endpoint_id,
                    account_id=endpoint.account_id,
                    options={**options, "context_window": context_window},
                )
                try:
                    agent_result = await agent.run(agent_ctx)
                    break
                except Exception as exc:  # noqa: BLE001
                    last_exc = exc
                    log.warning(
                        "Agent %s failed on endpoint %s, trying next: %s",
                        agent.name,
                        endpoint.endpoint_id,
                        exc,
                    )

            if agent_result is None:
                raise RuntimeError(
                    f"All endpoints failed for agent '{agent.name}': {last_exc}"
                )

            results.append(agent_result)

        # 5. Aggregate
        aggregated = self._aggregator.aggregate(results)
        await self._check_cancel(cancel_event, request_id, is_cancelled)
        full_text = aggregated["content"]
        citations = aggregated["citations"]
        chunk_size = 200
        persist_flush_chars = int(options.get("persist_flush_chars", 800))
        seq = 0
        persisted_buffer = ""
        last_persisted_len = 0

        for i in range(0, len(full_text), chunk_size):
            await self._check_cancel(cancel_event, request_id, is_cancelled)
            delta = full_text[i : i + chunk_size]
            persisted_buffer += delta
            if (
                on_partial_persist is not None
                and (len(persisted_buffer) - last_persisted_len) >= max(100, persist_flush_chars)
            ):
                await on_partial_persist(message_id, persisted_buffer)
                last_persisted_len = len(persisted_buffer)
            await self._streamer.publish_chunk(
                chatroom_id=chatroom_id,
                message_id=message_id,
                request_id=request_id,
                sequence=seq,
                content_delta=delta,
                citations=citations if i == 0 else [],
                done=False,
            )
            seq += 1

        # 7. Publish completion
        model_used = candidate_endpoints[0].provider_model_name if candidate_endpoints else model_id
        usage = await self._meter.estimate(question, full_text, model_used)
        if on_partial_persist is not None:
            await on_partial_persist(message_id, full_text)
        if on_completed is not None:
            await on_completed(request_id, message_id, full_text)
        await self._streamer.publish_completed(
            chatroom_id=chatroom_id,
            message_id=message_id,
            request_id=request_id,
            final_content=full_text,
            citations=citations,
            usage=usage,
            model_used=model_used,
        )

    @staticmethod
    def cancel(request_id: str) -> None:
        event = _CANCELLATION_REGISTRY.get(request_id)
        if event:
            event.set()
            log.info("Cancellation signal set for request_id=%s", request_id)

    @staticmethod
    async def _check_cancel(
        event: asyncio.Event,
        request_id: str,
        is_cancelled: CancelledProbe | None,
    ) -> None:
        if event.is_set():
            raise asyncio.CancelledError("Pipeline cancelled by user request")
        if is_cancelled is not None and await is_cancelled(request_id):
            raise asyncio.CancelledError("Pipeline cancelled by persisted execution state")
