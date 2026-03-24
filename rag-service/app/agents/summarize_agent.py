"""Agents – Summarize agent: produces a concise summary of retrieved content."""

from __future__ import annotations

import logging

from app.agents.base_agent import AgentContext, AgentResult, BaseAgent
from app.llm.base_provider import LLMMessage, LLMRequest
from app.llm.provider_router import ProviderRouter

log = logging.getLogger(__name__)


class SummarizeAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "summarize"

    @property
    def description(self) -> str:
        return "Produces a concise summary of retrieved document content."

    async def run(self, context: AgentContext) -> AgentResult:
        ctx_text = self._build_context_text(context.chunks)
        citations = self._extract_citations(context.chunks)

        messages = [
            LLMMessage(
                role="system",
                content=(
                    "You are a summarization expert. "
                    "Produce a clear, concise summary of the provided document excerpts "
                    "that directly addresses the user's request. "
                    "Keep the summary to 3-5 paragraphs."
                ),
            ),
            LLMMessage(
                role="user",
                content=(
                    f"Document excerpts:\n{ctx_text}\n\n"
                    f"Summarize in relation to: {context.question}"
                ),
            ),
        ]

        router = ProviderRouter()
        selected_model = context.model_name or context.model_id
        provider = router.route(
            selected_model,
            context.user_api_key,
            preferred_provider=context.provider_name,
            allow_fallback=not bool(selected_model or context.provider_name),
        )
        request = LLMRequest(
            messages=messages,
            model=selected_model,
            max_tokens=context.options.get("max_tokens", 1024),
            temperature=0.1,
            stream=False,
            user_api_key=context.user_api_key,
        )

        content_parts = []
        async for chunk in provider.stream(request):
            content_parts.append(chunk.delta)

        return AgentResult(
            agent_name=self.name,
            content="".join(content_parts),
            citations=citations,
        )
