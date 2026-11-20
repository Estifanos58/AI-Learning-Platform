"""Agents – Research agent: synthesises information from retrieved chunks."""

from __future__ import annotations

import logging
from typing import Awaitable, Callable, Optional

from app.agents.base_agent import (
    PROMPT_INJECTION_DEFENSE,
    AgentContext,
    AgentResult,
    BaseAgent,
)
from app.llm.base_provider import LLMMessage

log = logging.getLogger(__name__)


class ResearchAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "research"

    @property
    def description(self) -> str:
        return "Synthesises answers from document context."

    async def run(
        self,
        context: AgentContext,
        on_chunk: Optional[Callable[[str], Awaitable[None]]] = None,
    ) -> AgentResult:
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
                "Cite sources using [N] notation where [N] corresponds to the indexed excerpt. "
                "If the answer is not in the excerpts, say so clearly.\n\n"
                f"{PROMPT_INJECTION_DEFENSE}"
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

        exec_res = await self._execute_llm(
            context=context,
            messages=messages,
            max_tokens=context.options.get("max_tokens", 2048),
            temperature=context.options.get("temperature", 0.2),
            on_chunk=on_chunk,
        )

        content = exec_res.content if hasattr(exec_res, "content") else str(exec_res)
        valid_citations = self._validate_and_filter_citations(content, citations)

        return AgentResult(
            agent_name=self.name,
            content=content,
            citations=valid_citations,
            confidence=0.9,
            provider_result=exec_res if hasattr(exec_res, "content") else None,
        )
