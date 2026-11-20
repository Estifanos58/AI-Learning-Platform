"""Tests for model-specific token pricing and provider-reported usage in TokenMeter."""

import pytest

from app.usage.token_meter import TokenMeter


@pytest.mark.asyncio
async def test_token_meter_model_specific_pricing():
    meter = TokenMeter()

    # 10,000 prompt tokens, 5,000 completion tokens
    prompt_tokens = 10_000
    completion_tokens = 5_000

    # gpt-4o-mini: prompt $0.00015/1k, completion $0.0006/1k
    # expected: (10 * 0.00015) + (5 * 0.0006) = 0.0015 + 0.003 = 0.0045
    res_mini = await meter.estimate(
        prompt="prompt",
        completion="completion",
        model_id="gpt-4o-mini",
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )
    assert res_mini["cost_estimate"] == pytest.approx(0.0045, rel=1e-3)
    assert res_mini["prompt_tokens"] == 10_000
    assert res_mini["completion_tokens"] == 5_000
    assert res_mini["provider_reported"] is True

    # gpt-4o: prompt $0.0025/1k, completion $0.010/1k
    # expected: (10 * 0.0025) + (5 * 0.010) = 0.025 + 0.050 = 0.075
    res_4o = await meter.estimate(
        prompt="prompt",
        completion="completion",
        model_id="gpt-4o",
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )
    assert res_4o["cost_estimate"] == pytest.approx(0.075, rel=1e-3)

    # deepseek-chat: prompt $0.00014/1k, completion $0.00028/1k
    # expected: (10 * 0.00014) + (5 * 0.00028) = 0.0014 + 0.0014 = 0.0028
    res_ds = await meter.estimate(
        prompt="prompt",
        completion="completion",
        model_id="deepseek-chat",
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )
    assert res_ds["cost_estimate"] == pytest.approx(0.0028, rel=1e-3)


@pytest.mark.asyncio
async def test_token_meter_character_fallback_when_tokens_unreported():
    meter = TokenMeter()
    text = "Hello world! This is a test."
    res = await meter.estimate(prompt=text, completion=text, model_id="gpt-4o-mini")

    assert res["prompt_tokens"] > 0
    assert res["completion_tokens"] > 0
    assert res["total_tokens"] == res["prompt_tokens"] + res["completion_tokens"]
    assert res["provider_reported"] is False
    assert res["cost_estimate"] > 0.0
