from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet

from app.config import get_settings


def _normalize_key(secret: str) -> bytes:
    try:
        key = secret.encode("utf-8")
        Fernet(key)
        return key
    except Exception:
        digest = hashlib.sha256(secret.encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest)


def _fernet() -> Fernet:
    settings = get_settings()
    return Fernet(_normalize_key(settings.ai_key_encryption_secret))


def encrypt_key(api_key: str) -> str:
    if not api_key:
        raise ValueError("api_key is required")
    token = _fernet().encrypt(api_key.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_key(encrypted_key: str) -> str:
    if not encrypted_key:
        raise ValueError("encrypted_key is required")
    plain = _fernet().decrypt(encrypted_key.encode("utf-8"))
    return plain.decode("utf-8")
