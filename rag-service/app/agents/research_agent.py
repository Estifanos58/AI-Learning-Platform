"""Agents – Research agent: synthesises information from retrieved chunks."""

from __future__ import annotations

import logging

from app.agents.base_agent import AgentContext, AgentResult, BaseAgent
from app.llm.base_provider import LLMMessage

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

        history_parts = []
        for msg in context.options.get("context_window", []):
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_parts.append(LLMMessage(role=role, content=content))

        if ctx_text:
            system_prompt = (
                "You are an expert research assistant. "
                "Answer the user's question using ONLY the provided document excerpts. "
                "Cite sources using [N] notation. "
                "If the answer is not in the excerpts, say so clearly."
            )
            user_content = f"Document excerpts:\n{ctx_text}\n\nQuestion: {context.question}"
        else:
            system_prompt = (
                "You are a helpful and expert AI assistant. "
                "Provide a clear and accurate answer to the user's question."
            )
            user_content = context.question

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
            temperature=context.options.get("temperature", 0.2),
        )

        return AgentResult(
            agent_name=self.name,
            content=content,
            citations=citations,
            confidence=0.9,
        )
