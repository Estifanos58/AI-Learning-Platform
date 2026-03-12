"""Agents – Exam agent: generates quiz questions from document content."""

from __future__ import annotations

import logging

from app.agents.base_agent import AgentContext, AgentResult, BaseAgent
from app.llm.base_provider import LLMMessage, LLMRequest
from app.llm.provider_router import ProviderRouter

log = logging.getLogger(__name__)


class ExamAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "exam"

    @property
    def description(self) -> str:
        return "Generates exam/quiz questions based on document content."

    async def run(self, context: AgentContext) -> AgentResult:
        ctx_text = self._build_context_text(context.chunks)
        citations = self._extract_citations(context.chunks)
        num_questions = context.options.get("num_questions", 5)

        messages = [
            LLMMessage(
                role="system",
                content=(
                    f"You are an expert educator. "
                    f"Generate {num_questions} exam questions with answers "
                    "based on the provided document excerpts. "
                    "Format: Q: <question>\nA: <answer>\n"
                ),
            ),
            LLMMessage(
                role="user",
                content=(
                    f"Document excerpts:\n{ctx_text}\n\n"
                    f"Topic focus: {context.question}"
                ),
            ),
        ]

        router = ProviderRouter()
        provider = router.route(context.model_id, context.user_api_key)
        request = LLMRequest(
            messages=messages,
            model=context.model_id,
            max_tokens=context.options.get("max_tokens", 2048),
            temperature=0.4,
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
