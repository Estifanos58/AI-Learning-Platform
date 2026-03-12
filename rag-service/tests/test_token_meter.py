"""Tests for token meter and cost estimation."""

import pytest
from app.usage.token_meter import TokenMeter


@pytest.mark.asyncio
async def test_estimate_returns_tokens():
    meter = TokenMeter()
    result = await meter.estimate("Hello world", "This is a response.", "gpt-4o-mini")
    assert result["prompt_tokens"] > 0
    assert result["completion_tokens"] > 0
    assert result["total_tokens"] == result["prompt_tokens"] + result["completion_tokens"]


@pytest.mark.asyncio
async def test_estimate_cost_non_negative():
    meter = TokenMeter()
    result = await meter.estimate("A" * 1000, "B" * 500, "gpt-4o-mini")
    assert result["cost_estimate"] >= 0.0


@pytest.mark.asyncio
async def test_estimate_local_has_zero_cost():
    meter = TokenMeter()
    result = await meter.estimate("Hello", "World", "local")
    assert result["cost_estimate"] == 0.0
