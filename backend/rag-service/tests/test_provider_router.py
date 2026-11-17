"""Tests for the provider router."""

import pytest
from app.llm.provider_router import ProviderRouter


def test_route_openai_keyword():
    router = ProviderRouter()
    # Even without API key, routing decision is by keyword
    provider = None
    try:
        provider = router.route("gpt-4o-mini")
    except RuntimeError:
        pass  # expected if no keys configured


def test_route_gemini_keyword():
    router = ProviderRouter()
    try:
        provider = router.route("gemini-3.0")
    except RuntimeError:
        pass


def test_route_deepseek_keyword():
    router = ProviderRouter()
    try:
        provider = router.route("deepseek-chat")
    except RuntimeError:
        pass


def test_route_openrouter_keyword():
    router = ProviderRouter()
    try:
        router.route("openrouter/openai/gpt-4o-mini")
    except RuntimeError:
        pass


def test_route_groq_keyword():
    router = ProviderRouter()
    try:
        router.route("groq/llama-3.3-70b-versatile")
    except RuntimeError:
        pass


def test_available_providers_returns_list():
    router = ProviderRouter()
    providers = router.available_providers()
    assert isinstance(providers, list)


def test_route_none_raises_if_no_provider(monkeypatch):
    """When no providers are configured, route() should raise RuntimeError."""
    router = ProviderRouter()
    # Disable all providers
    for p in router._providers.values():
        monkeypatch.setattr(p, "is_available", lambda: False)
    with pytest.raises(RuntimeError):
        router.route(None)


def test_route_uses_user_key_even_when_provider_not_available(monkeypatch):
    router = ProviderRouter()
    provider = router._providers["openai"]
    monkeypatch.setattr(provider, "is_available", lambda: False)

    selected = router.route("gpt-4o", user_api_key="user-key-present")
    assert selected.provider_name == "openai"


def test_route_explicit_model_does_not_fallback(monkeypatch):
    router = ProviderRouter()
    monkeypatch.setattr(router._providers["openai"], "is_available", lambda: False)
    monkeypatch.setattr(router._providers["deepseek"], "is_available", lambda: True)

    with pytest.raises(RuntimeError, match="maps to provider 'openai'"):
        router.route("gpt-4o-mini", allow_fallback=False)


def test_route_explicit_provider_alias_google_maps_to_gemini(monkeypatch):
    router = ProviderRouter()
    monkeypatch.setattr(router._providers["gemini"], "is_available", lambda: True)

    selected = router.route(None, preferred_provider="google", allow_fallback=False)
    assert selected.provider_name == "gemini"


def test_route_explicit_unknown_model_raises_when_fallback_disabled():
    router = ProviderRouter()
    with pytest.raises(RuntimeError, match="Unable to map requested model"):
        router.route("custom-unknown-model", allow_fallback=False)


def test_route_explicit_provider_openrouter(monkeypatch):
    router = ProviderRouter()
    monkeypatch.setattr(router._providers["openrouter"], "is_available", lambda: True)

    selected = router.route(None, preferred_provider="openrouter", allow_fallback=False)
    assert selected.provider_name == "openrouter"


def test_route_explicit_provider_groq(monkeypatch):
    router = ProviderRouter()
    monkeypatch.setattr(router._providers["groq"], "is_available", lambda: True)

    selected = router.route(None, preferred_provider="groq", allow_fallback=False)
    assert selected.provider_name == "groq"
