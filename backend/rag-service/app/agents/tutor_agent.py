"""Agents – Tutor agent: interactive tutoring with Socratic questioning."""

from __future__ import annotations

from typing import Awaitable, Callable, Optional

from app.agents.base_agent import (
    PROMPT_INJECTION_DEFENSE,
    AgentContext,
    AgentResult,
    BaseAgent,
)
from app.llm.base_provider import LLMMessage


class TutorAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "tutor"

    @property
    def description(self) -> str:
        return "Provides interactive tutoring with hints and guided discovery."

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
                "You are a Socratic tutor. "
                "Guide the student to the answer using hints and questions rather than "
                "giving direct answers immediately. "
                "Use the provided document excerpts as your knowledge source.\n\n"
                f"{PROMPT_INJECTION_DEFENSE}"
            )
            user_content = f"Document excerpts:\n{ctx_text}\n\nStudent question: {context.question}"
        else:
            system_prompt = (
                "You are a Socratic tutor. "
                "Guide the student to the answer using hints and questions rather than "
                "giving direct answers immediately."
            )
            user_content = f"Student question: {context.question}"

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
            max_tokens=context.options.get("max_tokens", 1024),
            temperature=0.5,
            on_chunk=on_chunk,
        )

        content = exec_res.content if hasattr(exec_res, "content") else str(exec_res)
        valid_citations = self._validate_and_filter_citations(content, citations)

        return AgentResult(
            agent_name=self.name,
            content=content,
            citations=valid_citations,
            provider_result=exec_res if hasattr(exec_res, "content") else None,
        )
