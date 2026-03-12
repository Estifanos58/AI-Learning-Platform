"""Orchestration – workflow builder: instantiates the agent pipeline."""

from __future__ import annotations

from typing import Any, Dict, List

from app.agents.base_agent import BaseAgent
from app.agents.citation_agent import CitationAgent
from app.agents.exam_agent import ExamAgent
from app.agents.explanation_agent import ExplanationAgent
from app.agents.research_agent import ResearchAgent
from app.agents.summarize_agent import SummarizeAgent
from app.agents.tutor_agent import TutorAgent
from app.orchestration.planner_agent import ExecutionPlan

# Registry: name → agent class (no hardcoded branching elsewhere)
_AGENT_REGISTRY: Dict[str, type[BaseAgent]] = {
    "research": ResearchAgent,
    "summarize": SummarizeAgent,
    "exam": ExamAgent,
    "explanation": ExplanationAgent,
    "citation": CitationAgent,
    "tutor": TutorAgent,
}


class WorkflowBuilder:
    """
    Builds an ordered list of agent instances from an ExecutionPlan.
    Agents not in the registry are silently skipped.
    """

    def build(self, plan: ExecutionPlan) -> List[BaseAgent]:
        agents: List[BaseAgent] = []
        for name in plan.selected_agents:
            cls = _AGENT_REGISTRY.get(name)
            if cls:
                agents.append(cls())
        return agents

    @staticmethod
    def available_agents() -> List[str]:
        return list(_AGENT_REGISTRY.keys())
