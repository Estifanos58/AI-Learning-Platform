"""Orchestration – Planner agent: selects agents and execution plan."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.llm.base_provider import LLMMessage, LLMRequest
from app.llm.provider_router import ProviderRouter

log = logging.getLogger(__name__)

_AGENT_DESCRIPTIONS = {
    "research": "Answer questions using retrieved document content with citations.",
    "summarize": "Produce a concise summary of the document content.",
    "exam": "Generate quiz/exam questions from the documents.",
    "explanation": "Explain a concept in depth using the documents.",
    "citation": "Return structured citation list from document excerpts.",
    "tutor": "Interactive Socratic tutoring guided by the documents.",
}

_KEYWORD_TRIGGERS: Dict[str, List[str]] = {
    "summarize": ["summarize", "summary", "overview", "brief", "tldr"],
    "exam": ["quiz", "exam", "question", "test", "exercise", "mcq"],
    "explanation": ["explain", "what is", "how does", "define", "describe"],
    "tutor": ["help me understand", "teach me", "guide me", "hint"],
    "citation": ["cite", "citation", "reference", "source"],
    "research": [],  # default fallback
}


@dataclass
class ExecutionPlan:
    selected_agents: List[str] = field(default_factory=lambda: ["research"])
    parallel_groups: List[List[str]] = field(default_factory=list)
    aggregation_format: str = "markdown"
    rationale: str = ""


class PlannerAgent:
    """
    Selects which agents to run and in what order/parallelism.

    Strategy:
      1. Keyword-based heuristic (fast, offline).
      2. Optional LLM-based planning for complex queries (fallback to heuristic if LLM fails).
    """

    async def plan(
        self,
        question: str,
        context_summary: str,
        model_id: Optional[str] = None,
        user_api_key: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> ExecutionPlan:
        opts = options or {}

        # Try LLM-based planning if model available
        if model_id or user_api_key:
            try:
                return await self._llm_plan(question, context_summary, model_id, user_api_key, opts)
            except Exception as exc:  # noqa: BLE001
                log.warning("LLM planner failed, using heuristic: %s", exc)

        return self._heuristic_plan(question)

    def _heuristic_plan(self, question: str) -> ExecutionPlan:
        q_lower = question.lower()
        selected = []

        for agent, keywords in _KEYWORD_TRIGGERS.items():
            for kw in keywords:
                if kw in q_lower:
                    selected.append(agent)
                    break

        if not selected:
            selected = ["research"]

        # Always append citation if research or explanation selected
        if any(a in selected for a in ("research", "explanation")) and "citation" not in selected:
            selected.append("citation")

        return ExecutionPlan(
            selected_agents=selected,
            parallel_groups=[],
            rationale="heuristic",
        )

    async def _llm_plan(
        self,
        question: str,
        context_summary: str,
        model_id: Optional[str],
        user_api_key: Optional[str],
        options: Dict[str, Any],
    ) -> ExecutionPlan:
        agent_list = "\n".join(
            f"- {name}: {desc}" for name, desc in _AGENT_DESCRIPTIONS.items()
        )
        messages = [
            LLMMessage(
                role="system",
                content=(
                    "You are an orchestration planner for a RAG system. "
                    "Given a user question and context summary, select which agents to run. "
                    f"Available agents:\n{agent_list}\n\n"
                    "Respond with a JSON object: "
                    '{"agents": ["agent1", "agent2"], "rationale": "reason"}'
                ),
            ),
            LLMMessage(
                role="user",
                content=(
                    f"Question: {question}\n"
                    f"Context summary (first 500 chars): {context_summary[:500]}"
                ),
            ),
        ]

        router = ProviderRouter()
        provider = router.route(model_id, user_api_key)
        request = LLMRequest(
            messages=messages,
            model=model_id,
            max_tokens=256,
            temperature=0.0,
            stream=False,
            user_api_key=user_api_key,
        )

        parts = []
        async for chunk in provider.stream(request):
            parts.append(chunk.delta)

        raw = "".join(parts)
        import json

        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            data = json.loads(match.group())
            agents = data.get("agents", ["research"])
            rationale = data.get("rationale", "")
            valid = [a for a in agents if a in _AGENT_DESCRIPTIONS]
            if not valid:
                valid = ["research"]
            return ExecutionPlan(selected_agents=valid, rationale=rationale)

        return self._heuristic_plan(question)
