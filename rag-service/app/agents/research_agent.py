"""Agents – Research agent: synthesises information from retrieved chunks."""

from __future__ import annotations

import logging

from app.agents.base_agent import AgentContext, AgentResult, BaseAgent
from app.llm.base_provider import LLMMessage, LLMRequest
from app.llm.provider_router import ProviderRouter

log = logging.getLogger(__name__)


class ResearchAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "research"

    @property
    def description(self) -> str:
        return "Synthesises answers from document context."

    async def run(self, context: AgentContext) -> AgentResult:
        ctx_text = self._build_context_text(context.chunks)
        citations = self._extract_citations(context.chunks)

        messages = [
            LLMMessage(
                role="system",
                content=(
                    "You are an expert research assistant. "
                    "Answer the user's question using ONLY the provided document excerpts. "
                    "Cite sources using [N] notation. "
                    "If the answer is not in the excerpts, say so clearly."
                ),
            ),
            LLMMessage(
                role="user",
                content=(
                    f"Document excerpts:\n{ctx_text}\n\n"
                    f"Question: {context.question}"
                ),
            ),
        ]

        router = ProviderRouter()
        provider = router.route(context.model_id, context.user_api_key)
        request = LLMRequest(
            messages=messages,
            model=context.model_id,
            max_tokens=context.options.get("max_tokens", 2048),
            temperature=context.options.get("temperature", 0.2),
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
            confidence=0.9,
        )
