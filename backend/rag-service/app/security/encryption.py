from __future__ import annotations

import base64
import hashlib
from typing import Iterable, List

from cryptography.fernet import Fernet, InvalidToken, MultiFernet

from app.config import get_settings


def _normalize_key(secret: str) -> bytes:
    if not secret or not secret.strip():
        raise ValueError("Encryption secret must be non-empty")
    cleaned = secret.strip()
    try:
        key = cleaned.encode("utf-8")
        Fernet(key)
        return key
    except Exception:
        digest = hashlib.sha256(cleaned.encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest)


def _build_multi_fernet(primary_secret: str, previous_secrets: Iterable[str] = ()) -> MultiFernet:
    fernets: List[Fernet] = [Fernet(_normalize_key(primary_secret))]
    for prev in previous_secrets:
        if prev and prev.strip():
            fernets.append(Fernet(_normalize_key(prev)))
    return MultiFernet(fernets)


def _fernet() -> MultiFernet:
    settings = get_settings()
    if not settings.ai_key_encryption_secret:
        raise ValueError("AI_KEY_ENCRYPTION_SECRET is not configured")
    return _build_multi_fernet(
        settings.ai_key_encryption_secret,
        settings.get_previous_encryption_secrets(),
    )


def encrypt_key(api_key: str) -> str:
    if not api_key:
        raise ValueError("api_key is required")
    token = _fernet().encrypt(api_key.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_key(encrypted_key: str) -> str:
    if not encrypted_key:
        raise ValueError("encrypted_key is required")
    try:
        plain = _fernet().decrypt(encrypted_key.encode("utf-8"))
        return plain.decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt secret with configured primary or rotation keys") from exc


def rotate_encrypted_key(encrypted_key: str) -> str:
    """Re-encrypt an existing ciphertext under the current primary key."""
    if not encrypted_key:
        raise ValueError("encrypted_key is required")
    try:
        rotated = _fernet().rotate(encrypted_key.encode("utf-8"))
        return rotated.decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Failed to rotate secret with configured primary or rotation keys") from exc

