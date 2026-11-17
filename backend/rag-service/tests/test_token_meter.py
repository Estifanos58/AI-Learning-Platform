"""Tests for token meter and cost estimation."""

import asyncio

from app.usage.token_meter import TokenMeter


def test_estimate_returns_tokens():
    async def run():
        meter = TokenMeter()
        result = await meter.estimate("Hello world", "This is a response.", "gpt-4o-mini")
        assert result["prompt_tokens"] > 0
        assert result["completion_tokens"] > 0
        assert result["total_tokens"] == result["prompt_tokens"] + result["completion_tokens"]

    asyncio.run(run())


def test_estimate_cost_non_negative():
    async def run():
        meter = TokenMeter()
        result = await meter.estimate("A" * 1000, "B" * 500, "gpt-4o-mini")
        assert result["cost_estimate"] >= 0.0

    asyncio.run(run())


def test_estimate_local_has_zero_cost():
    async def run():
        meter = TokenMeter()
        result = await meter.estimate("Hello", "World", "local")
        assert result["cost_estimate"] == 0.0

    asyncio.run(run())


def test_estimate_supports_openrouter_and_groq_ids():
    async def run():
        meter = TokenMeter()
        openrouter_result = await meter.estimate("Hello", "World", "openrouter/openai/gpt-4o-mini")
        groq_result = await meter.estimate("Hello", "World", "groq/llama-3.3-70b-versatile")

        assert openrouter_result["cost_estimate"] >= 0.0
        assert groq_result["cost_estimate"] >= 0.0

    asyncio.run(run())
