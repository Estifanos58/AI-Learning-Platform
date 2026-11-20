"""Agents – Exam agent: generates quiz questions from document content."""

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


class ExamAgent(BaseAgent):

    @property
    def name(self) -> str:
        return "exam"

    @property
    def description(self) -> str:
        return "Generates exam/quiz questions based on document content."

    async def run(
        self,
        context: AgentContext,
        on_chunk: Optional[Callable[[str], Awaitable[None]]] = None,
    ) -> AgentResult:
        ctx_text = self._build_context_text(context.chunks)
        citations = self._extract_citations(context.chunks)
        num_questions = context.options.get("num_questions", 5)

        history_parts = []
        for msg in context.options.get("context_window", []):
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_parts.append(LLMMessage(role=role, content=content))

        if ctx_text:
            system_prompt = (
                f"You are an expert educator. "
                f"Generate {num_questions} exam questions with answers "
                "based on the provided document excerpts. Cite sources where relevant with [N]. "
                "Format: Q: <question>\nA: <answer>\n\n"
                f"{PROMPT_INJECTION_DEFENSE}"
            )
            user_content = (
                f"Document excerpts:\n{ctx_text}\n\n"
                f"Topic focus: {context.question}"
            )
        else:
            system_prompt = (
                f"You are an expert educator. "
                f"Generate {num_questions} exam questions with answers "
                "based on the user's requested topic. "
                "Format: Q: <question>\nA: <answer>\n"
            )
            user_content = f"Topic focus: {context.question}"

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
            temperature=0.4,
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
