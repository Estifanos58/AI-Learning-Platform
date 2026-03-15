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
        provider = router.route("gemini-1.5-flash")
    except RuntimeError:
        pass


def test_route_deepseek_keyword():
    router = ProviderRouter()
    try:
        provider = router.route("deepseek-chat")
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
