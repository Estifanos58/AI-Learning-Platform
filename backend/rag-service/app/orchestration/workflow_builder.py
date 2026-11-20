"""Orchestration – workflow builder: instantiates the agent pipeline."""

from __future__ import annotations

from typing import Dict, List

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
    Builds an ordered list or parallel groups of agent instances from an ExecutionPlan.
    Agents not in the registry are silently skipped.
    """

    def build(self, plan: ExecutionPlan) -> List[BaseAgent]:
        agents: List[BaseAgent] = []
        for name in plan.selected_agents:
            cls = _AGENT_REGISTRY.get(name)
            if cls:
                agents.append(cls())
        return agents

    def build_groups(self, plan: ExecutionPlan) -> List[List[BaseAgent]]:
        """
        Builds execution stages, where each stage is a list of independent
        agents that can run concurrently using asyncio.gather.
        """
        if not plan.parallel_groups:
            return [[a] for a in self.build(plan)]

        groups: List[List[BaseAgent]] = []
        accounted: set[str] = set()

        for group_names in plan.parallel_groups:
            stage: List[BaseAgent] = []
            for name in group_names:
                cls = _AGENT_REGISTRY.get(name)
                if cls:
                    stage.append(cls())
                    accounted.add(name)
            if stage:
                groups.append(stage)

        # Remaining agents not placed in explicit parallel groups
        for name in plan.selected_agents:
            if name not in accounted:
                cls = _AGENT_REGISTRY.get(name)
                if cls:
                    groups.append([cls()])
                    accounted.add(name)

        return groups

    @staticmethod
    def available_agents() -> List[str]:
        return list(_AGENT_REGISTRY.keys())
