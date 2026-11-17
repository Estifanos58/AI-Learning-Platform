from app.config import get_settings
from app.security.encryption import decrypt_key, encrypt_key


def test_encrypt_decrypt_round_trip(monkeypatch):
    monkeypatch.setenv("AI_KEY_ENCRYPTION_SECRET", "unit-test-secret")
    get_settings.cache_clear()

    raw = "sk-test-123456"
    encrypted = encrypt_key(raw)

    assert encrypted != raw
    assert decrypt_key(encrypted) == raw


def test_encrypt_empty_raises():
    try:
        encrypt_key("")
        assert False
    except ValueError:
        assert True
