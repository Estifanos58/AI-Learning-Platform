"""Agents – Explanation agent: deep-dives on a concept from documents."""

from __future__ import annotations

from app.agents.base_agent import AgentContext, AgentResult, BaseAgent
from app.llm.base_provider import LLMMessage


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

        history_parts = []
        for msg in context.options.get("context_window", []):
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_parts.append(LLMMessage(role=role, content=content))

        if ctx_text:
            system_prompt = (
                "You are a knowledgeable tutor. "
                "Explain the concept in the user's question thoroughly and clearly, "
                "using the provided document excerpts as your primary source. "
                "Use examples and analogies where helpful."
            )
            user_content = f"Document excerpts:\n{ctx_text}\n\nExplain: {context.question}"
        else:
            system_prompt = (
                "You are a knowledgeable tutor. "
                "Explain the concept in the user's question thoroughly and clearly. "
                "Use examples and analogies where helpful."
            )
            user_content = f"Explain: {context.question}"

        messages = [
            LLMMessage(
                role="system",
                content=system_prompt,
            ),
            *history_parts,
            LLMMessage(
                role="user",
                content=user_content,
            ),
        ]

        content = await self._execute_llm(
            context=context,
            messages=messages,
            max_tokens=context.options.get("max_tokens", 2048),
            temperature=0.3,
        )

        return AgentResult(
            agent_name=self.name,
            content=content,
            citations=citations,
        )
