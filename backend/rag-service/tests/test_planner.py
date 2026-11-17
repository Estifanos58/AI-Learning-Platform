"""Tests for the planner agent heuristic."""

import pytest
from app.orchestration.planner_agent import PlannerAgent


def test_heuristic_plan_research_by_default():
    planner = PlannerAgent()
    # A question without any specific keywords falls back to research
    plan = planner._heuristic_plan("Tell me about the lecture content")
    assert "research" in plan.selected_agents


def test_heuristic_plan_summarize():
    planner = PlannerAgent()
    plan = planner._heuristic_plan("Can you summarize this document?")
    assert "summarize" in plan.selected_agents


def test_heuristic_plan_exam():
    planner = PlannerAgent()
    plan = planner._heuristic_plan("Generate a quiz based on the text")
    assert "exam" in plan.selected_agents


def test_heuristic_plan_explanation():
    planner = PlannerAgent()
    plan = planner._heuristic_plan("Explain how neural networks work")
    assert "explanation" in plan.selected_agents


def test_heuristic_plan_tutor():
    planner = PlannerAgent()
    plan = planner._heuristic_plan("Help me understand recursion")
    assert "tutor" in plan.selected_agents


def test_heuristic_plan_adds_citation_with_research():
    planner = PlannerAgent()
    plan = planner._heuristic_plan("What does the paper say?")
    # research + citation should be in the plan
    assert "research" in plan.selected_agents
    assert "citation" in plan.selected_agents
