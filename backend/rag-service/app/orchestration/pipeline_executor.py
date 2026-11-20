"""Orchestration – pipeline executor: orchestrates the full RAG pipeline."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from typing import Any, Awaitable, Callable, Dict

from app.agents.base_agent import AgentContext, AgentResult, BaseAgent
from app.llm.model_orchestrator import EndpointSelection, ModelOrchestrator
from app.llm.provider_executor import (
    ProviderPermanentError,
    ProviderTransientError,
    is_retryable_exception,
)
from app.observability import EXECUTION_COST_TOTAL, TIME_TO_FIRST_TOKEN_SECONDS
from app.orchestration.planner_agent import PlannerAgent
from app.orchestration.response_aggregator import ResponseAggregator
from app.orchestration.workflow_builder import WorkflowBuilder
from app.retrieval.reranker import Reranker
from app.retrieval.vector_search import VectorSearch
from app.security.user_permission_checker import UserPermissionChecker
from app.streaming.response_streamer import ResponseStreamer
from app.usage.token_meter import TokenMeter

log = logging.getLogger(__name__)

# In-process cancellation registry (request_id -> Event)
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
      4. Execute agents with endpoint failover
      5. Aggregate + stream response chunks
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
        defer_failure_handling = bool(payload.get("defer_failure_handling", False))

        on_partial_persist: PartialPersistHook | None = payload.get("on_partial_persist")
        on_completed: CompletionHook | None = payload.get("on_completed")
        on_failed: FailureHook | None = payload.get("on_failed")
        on_cancelled: CancelledHook | None = payload.get("on_cancelled")
        is_cancelled: CancelledProbe | None = payload.get("is_cancelled")

        if not model_id:
            raise ProviderPermanentError("ai_model_id is required", error_code="MISSING_MODEL_ID")

        candidate_endpoints = await self._orchestrator.select_endpoints(
            model_id=model_id,
            limit=max_retries,
        )
        if not candidate_endpoints:
            raise ProviderTransientError(
                f"No active endpoints available for ai_model_id '{model_id}'",
                error_code="NO_ACTIVE_ENDPOINTS",
            )

        cancel_event = _CANCELLATION_REGISTRY.get(request_id) or asyncio.Event()
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
                is_cancelled=is_cancelled,
            )
        except asyncio.CancelledError:
            if defer_failure_handling:
                raise
            await self.publish_cancelled(
                chatroom_id=chatroom_id,
                message_id=message_id,
                request_id=request_id,
            )
            if on_cancelled is not None:
                await on_cancelled(request_id)
        except Exception as exc:  # noqa: BLE001
            log.error("Pipeline failed for request_id=%s: %s", request_id, exc)
            if defer_failure_handling:
                raise
            await self.publish_failed(
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
                "Pipeline finished: request_id=%s latency_ms=%d", request_id, latency_ms
            )

    async def publish_failed(
        self,
        *,
        chatroom_id: str,
        message_id: str,
        request_id: str,
        error: str,
    ) -> None:
        await self._streamer.publish_failed(
            chatroom_id=chatroom_id,
            message_id=message_id,
            request_id=request_id,
            error=error,
        )

    async def publish_cancelled(
        self,
        *,
        chatroom_id: str,
        message_id: str,
        request_id: str,
    ) -> None:
        await self._streamer.publish_cancelled(
            chatroom_id=chatroom_id,
            message_id=message_id,
            request_id=request_id,
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

            if allowed_file_ids:
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
        stages = self._builder.build_groups(plan)
        await self._check_cancel(cancel_event, request_id, is_cancelled)

        # 4. Execute agents (parallel groups with endpoint failover and token streaming)
        results: list[AgentResult] = []
        seq = 0
        persisted_buffer = ""
        last_persisted_len = 0
        persist_flush_chars = int(options.get("persist_flush_chars", 400))
        first_token_recorded = False
        start_exec_time = time.monotonic()
        successful_endpoint: EndpointSelection | None = None
        total_prompt_tokens = 0
        total_completion_tokens = 0

        total_agents = sum(len(stage) for stage in stages)
        allow_live_streaming = (total_agents == 1)

        def make_stream_chunk_handler(endpoint: EndpointSelection):
            async def on_stream_chunk(delta: str) -> None:
                nonlocal seq, persisted_buffer, last_persisted_len, first_token_recorded
                if not delta:
                    return
                if not first_token_recorded:
                    first_token_recorded = True
                    ttft = max(0.0, time.monotonic() - start_exec_time)
                    TIME_TO_FIRST_TOKEN_SECONDS.labels(
                        provider=endpoint.provider_name,
                        model=endpoint.provider_model_name,
                    ).observe(ttft)

                persisted_buffer += delta
                if (
                    on_partial_persist is not None
                    and (len(persisted_buffer) - last_persisted_len) >= max(50, persist_flush_chars)
                ):
                    await on_partial_persist(message_id, persisted_buffer)
                    last_persisted_len = len(persisted_buffer)

                await self._streamer.publish_chunk(
                    chatroom_id=chatroom_id,
                    message_id=message_id,
                    request_id=request_id,
                    sequence=seq,
                    content_delta=delta,
                    citations=[],
                    done=False,
                )
                seq += 1
            return on_stream_chunk

        async def run_agent_with_failover(agent: BaseAgent, can_stream: bool) -> AgentResult:
            nonlocal successful_endpoint, total_prompt_tokens, total_completion_tokens
            last_exc: Exception | None = None
            saw_retryable = False

            for endpoint in candidate_endpoints[: max(1, max_retries)]:
                await self._check_cancel(cancel_event, request_id, is_cancelled)
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
                chunk_cb = make_stream_chunk_handler(endpoint) if can_stream else None
                try:
                    res = await agent.run(agent_ctx, on_chunk=chunk_cb)
                    successful_endpoint = endpoint
                    if res.provider_result:
                        total_prompt_tokens += res.provider_result.prompt_tokens
                        total_completion_tokens += res.provider_result.completion_tokens
                    return res
                except asyncio.CancelledError:
                    raise
                except Exception as exc:  # noqa: BLE001
                    last_exc = exc
                    if is_retryable_exception(exc):
                        saw_retryable = True
                    log.warning(
                        "Agent %s failed on endpoint %s, trying next: %s",
                        agent.name,
                        endpoint.endpoint_id,
                        exc,
                    )

            if saw_retryable:
                raise ProviderTransientError(
                    f"All endpoints failed transiently for agent '{agent.name}': {last_exc}",
                    error_code=getattr(last_exc, "error_code", "ALL_ENDPOINTS_TRANSIENT_FAILURE"),
                ) from last_exc
            raise ProviderPermanentError(
                f"All endpoints failed permanently for agent '{agent.name}': {last_exc}",
                error_code=getattr(last_exc, "error_code", "ALL_ENDPOINTS_PERMANENT_FAILURE"),
            ) from last_exc

        for stage in stages:
            await self._check_cancel(cancel_event, request_id, is_cancelled)
            if len(stage) == 1:
                res = await run_agent_with_failover(stage[0], can_stream=allow_live_streaming)
                results.append(res)
            else:
                stage_results = await asyncio.gather(
                    *[run_agent_with_failover(agent, can_stream=False) for agent in stage]
                )
                results.extend(stage_results)

        # 5. Aggregate
        aggregated = self._aggregator.aggregate(results)
        await self._check_cancel(cancel_event, request_id, is_cancelled)
        full_text = aggregated["content"]
        citations = aggregated["citations"]

        # If live streaming was not performed (multi-agent, fallback, or non-delta provider),
        # publish chunks from full_text
        if seq == 0 and full_text:
            chunk_size = 200
            for i in range(0, len(full_text), chunk_size):
                await self._check_cancel(cancel_event, request_id, is_cancelled)
                delta = full_text[i : i + chunk_size]
                persisted_buffer += delta
                if (
                    on_partial_persist is not None
                    and (len(persisted_buffer) - last_persisted_len) >= max(50, persist_flush_chars)
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

        # 6. Publish completion with model tracking and token accounting
        model_used = (
            successful_endpoint.provider_model_name
            if successful_endpoint
            else (candidate_endpoints[0].provider_model_name if candidate_endpoints else model_id)
        )
        provider_used = (
            successful_endpoint.provider_name
            if successful_endpoint
            else (candidate_endpoints[0].provider_name if candidate_endpoints else "")
        )

        usage = await self._meter.estimate(
            prompt=question,
            completion=full_text,
            model_id=model_used,
            prompt_tokens=total_prompt_tokens,
            completion_tokens=total_completion_tokens,
            provider_name=provider_used,
        )
        cost = usage.get("cost_estimate", 0.0)
        EXECUTION_COST_TOTAL.labels(provider=provider_used, model=model_used).inc(cost)

        if on_partial_persist is not None:
            await on_partial_persist(message_id, full_text)
        if on_completed is not None:
            try:
                await on_completed(
                    request_id,
                    message_id,
                    full_text,
                    actual_provider=provider_used,
                    actual_model=model_used,
                )
            except TypeError:
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
        if event is None:
            event = asyncio.Event()
            _CANCELLATION_REGISTRY[request_id] = event
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
