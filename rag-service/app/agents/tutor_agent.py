"""Agents – Tutor agent: interactive tutoring with Socratic questioning."""

from __future__ import annotations

from app.agents.base_agent import AgentContext, AgentResult, BaseAgent
from app.llm.base_provider import LLMMessage, LLMRequest
from app.llm.provider_router import ProviderRouter


class TutorAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "tutor"

    @property
    def description(self) -> str:
        return "Provides interactive tutoring with hints and guided discovery."

    async def run(self, context: AgentContext) -> AgentResult:
        ctx_text = self._build_context_text(context.chunks)
        citations = self._extract_citations(context.chunks)

        history_parts = []
        for msg in context.options.get("context_window", []):
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_parts.append(LLMMessage(role=role, content=content))

        messages = [
            LLMMessage(
                role="system",
                content=(
                    "You are a Socratic tutor. "
                    "Guide the student to the answer using hints and questions rather than "
                    "giving direct answers immediately. "
                    "Use the provided document excerpts as your knowledge source."
                ),
            ),
            *history_parts,
            LLMMessage(
                role="user",
                content=f"Document excerpts:\n{ctx_text}\n\nStudent question: {context.question}",
            ),
        ]

        router = ProviderRouter()
        provider = router.route(context.model_id, context.user_api_key)
        request = LLMRequest(
            messages=messages,
            model=context.model_id,
            max_tokens=context.options.get("max_tokens", 1024),
            temperature=0.5,
            stream=False,
            user_api_key=context.user_api_key,
        )

        parts = []
        async for chunk in provider.stream(request):
            parts.append(chunk.delta)

        return AgentResult(
            agent_name=self.name,
            content="".join(parts),
            citations=citations,
        )
