"""Agents – Explanation agent: deep-dives on a concept from documents."""

from __future__ import annotations

from app.agents.base_agent import AgentContext, AgentResult, BaseAgent
from app.llm.base_provider import LLMMessage, LLMRequest
from app.llm.provider_router import ProviderRouter


class ExplanationAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "explanation"

    @property
    def description(self) -> str:
        return "Explains a concept in depth using document content."

    async def run(self, context: AgentContext) -> AgentResult:
        ctx_text = self._build_context_text(context.chunks)
        citations = self._extract_citations(context.chunks)

        messages = [
            LLMMessage(
                role="system",
                content=(
                    "You are a knowledgeable tutor. "
                    "Explain the concept in the user's question thoroughly and clearly, "
                    "using the provided document excerpts as your primary source. "
                    "Use examples and analogies where helpful."
                ),
            ),
            LLMMessage(
                role="user",
                content=f"Document excerpts:\n{ctx_text}\n\nExplain: {context.question}",
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
            max_tokens=context.options.get("max_tokens", 2048),
            temperature=0.3,
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
