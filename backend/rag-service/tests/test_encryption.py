import pytest

from app.config import Settings, get_settings
from app.security.encryption import decrypt_key, encrypt_key, rotate_encrypted_key


def test_encrypt_decrypt_round_trip(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("AI_KEY_ENCRYPTION_SECRET", "unit-test-secret-with-good-length-32chars!")
    monkeypatch.delenv("AI_KEY_ENCRYPTION_PREVIOUS_SECRETS", raising=False)
    get_settings.cache_clear()

    raw = "sk-test-123456"
    encrypted = encrypt_key(raw)

    assert encrypted != raw
    assert decrypt_key(encrypted) == raw


def test_key_rotation_decrypts_old_and_rotates_to_primary(monkeypatch):
    old_secret = "old-production-encryption-key-with-32-plus-bytes!!"
    new_secret = "new-production-encryption-key-with-32-plus-bytes!!"

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("APP_GRPC_SERVICE_SECRET", "strong-grpc-secret-123456")
    monkeypatch.setenv("AI_KEY_ENCRYPTION_SECRET", old_secret)
    monkeypatch.delenv("AI_KEY_ENCRYPTION_PREVIOUS_SECRETS", raising=False)
    get_settings.cache_clear()

    ciphertext_v1 = encrypt_key("sk-provider-secret-value")

    # Rotate to new_secret while keeping old_secret in previous secrets
    monkeypatch.setenv("AI_KEY_ENCRYPTION_SECRET", new_secret)
    monkeypatch.setenv("AI_KEY_ENCRYPTION_PREVIOUS_SECRETS", old_secret)
    get_settings.cache_clear()

    assert decrypt_key(ciphertext_v1) == "sk-provider-secret-value"
    ciphertext_v2 = rotate_encrypted_key(ciphertext_v1)
    assert ciphertext_v2 != ciphertext_v1

    # Remove old secret: v2 must decrypt cleanly with only new_secret
    monkeypatch.delenv("AI_KEY_ENCRYPTION_PREVIOUS_SECRETS", raising=False)
    get_settings.cache_clear()

    assert decrypt_key(ciphertext_v2) == "sk-provider-secret-value"
    with pytest.raises(ValueError, match="Failed to decrypt"):
        decrypt_key(ciphertext_v1)


def test_production_rejects_default_or_short_encryption_secret(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("APP_GRPC_SERVICE_SECRET", "strong-grpc-secret-123456")
    monkeypatch.setenv("AI_KEY_ENCRYPTION_SECRET", "change-me-32-byte-encryption-key!!")
    get_settings.cache_clear()

    with pytest.raises(ValueError, match="AI_KEY_ENCRYPTION_SECRET"):
        Settings()

    monkeypatch.setenv("AI_KEY_ENCRYPTION_SECRET", "too-short")
    with pytest.raises(ValueError, match="AI_KEY_ENCRYPTION_SECRET"):
        Settings()


def test_production_rejects_default_grpc_secret(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("AI_KEY_ENCRYPTION_SECRET", "strong-production-key-32-bytes-minimum!!")
    monkeypatch.setenv("APP_GRPC_SERVICE_SECRET", "change-me-shared-secret")
    get_settings.cache_clear()

    with pytest.raises(ValueError, match="APP_GRPC_SERVICE_SECRET"):
        Settings()


def test_encrypt_empty_raises(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("AI_KEY_ENCRYPTION_SECRET", "unit-test-secret-with-good-length-32chars!")
    get_settings.cache_clear()

    with pytest.raises(ValueError):
        encrypt_key("")
