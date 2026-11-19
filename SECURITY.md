# Security Architecture & Operational Hardening

This document describes the security controls, secret management practices, and key rotation procedures for the **AI Learning Platform**.

---

## 1. JWT Signing & RSA Key Management

### No Deterministic Key Generation
- `auth-service` (`RsaKeyProvider`) and `api-gateway` (`PublicKeyProvider`) **never** generate deterministic or hardcoded RSA keys.
- Both services require valid RSA keys (**minimum 2048 bits**; PKCS#8 private key in `auth-service`, X.509 SPKI public key in `auth-service` and `api-gateway`).
- On startup, `auth-service` verifies key modulus matching and performs an RS256 sign-and-verify self-check. Startup fails fast if keys are missing, unreadable, malformed, too weak, or mismatched.
- JWT validation enforces RS256 signature verification, `iss` (`APP_JWT_ISSUER`), `aud` (`APP_JWT_AUDIENCE`), `exp`, and `jti`.

### Secret Injection
- **Docker Compose**: Keys are mounted via Docker Compose `secrets:` at `/run/secrets/jwt_private_key.pem` (auth-service only) and `/run/secrets/jwt_public_key.pem` (auth-service and api-gateway).
- **Local Development**: Run `./scripts/generate-dev-keys.sh` to create a local RSA-2048 keypair under `./secrets/` (git-ignored).
- **Production / Kubernetes**: Inject keys from your secret manager (Kubernetes Secrets, AWS Secrets Manager, HashiCorp Vault) mounted read-only at `/run/secrets/jwt_*.pem` or via `APP_JWT_PRIVATE_KEY_LOCATION` / `APP_JWT_PUBLIC_KEY_LOCATION`.

### Zero-Downtime RSA Key Rotation
1. Generate a new RSA keypair with a new `APP_JWT_KEY_ID` (e.g., `key-2026-q2`).
2. Configure `api-gateway` with the **new** public key as `APP_JWT_PUBLIC_KEY_LOCATION` and the **old** public key as `APP_JWT_PREVIOUS_PUBLIC_KEY_LOCATION` (or `APP_JWT_PREVIOUS_PUBLIC_KEY_PEM`), and roll `api-gateway`.
3. Update `auth-service` with the **new** private/public keypair and `APP_JWT_KEY_ID`, and roll `auth-service`.
4. After the maximum access-token TTL (`APP_JWT_ACCESS_EXP_MINUTES`, default 15 minutes) elapses, remove `APP_JWT_PREVIOUS_PUBLIC_KEY_LOCATION` from `api-gateway`.

---

## 2. Server-Managed Cookies & CSRF Protection

### Cookie-First Session Architecture
- Browser clients **do not** store JWT access or refresh tokens in `localStorage`, `sessionStorage`, or JavaScript-readable cookies.
- `api-gateway` (`AuthCookieService`, `GatewayAuthController`) sets:
  - `app_access_token`: `HttpOnly`, `Secure` (true by default), `SameSite=Lax` (configurable via `APP_AUTH_COOKIE_SAME_SITE`), scoped to `APP_AUTH_COOKIE_PATH`.
  - `app_refresh_token`: `HttpOnly`, `Secure`, `SameSite=Lax`, max-age aligned with refresh token lifetime.
  - `app_csrf_token`: Non-`HttpOnly` double-submit CSRF token cookie readable by first-party JS and required as `X-CSRF-Token` on state-changing requests.
- By default (`APP_AUTH_EXPOSE_TOKENS_IN_BODY=false`), `signup`, `login`, and `refresh` omit raw access/refresh tokens from JSON responses.
- WebSocket (`/ws/chat`) and SSE (`/api/ai/executions/{id}/stream`, `/api/chat/messages/{id}/stream`) endpoints authenticate via the `HttpOnly` access token cookie (or standard `Authorization: Bearer` header for non-browser API clients). Insecure `?token=` query parameters are rejected/disabled.

### CSRF Enforcement
- `CookieAuthAndCsrfWebFilter` enforces CSRF protection for every state-changing HTTP method (`POST`, `PUT`, `PATCH`, `DELETE`) authenticated via cookies:
  - Validates `Origin` / `Referer` against `GATEWAY_ALLOWED_ORIGINS`.
  - Compares the `X-CSRF-Token` request header against the `app_csrf_token` cookie using constant-time comparison (`MessageDigest.isEqual`).
- Public endpoints (`POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`) and bootstrap endpoints (`GET /api/auth/session`, `GET /api/auth/csrf`) remain accessible without a prior session.

---

## 3. Inter-Service gRPC Authentication

- Every backend gRPC server (`auth-service`, `user-profile-service`, `file-service`, `chat-service`, `rag-service`) validates `x-service-secret` metadata using constant-time comparison (`MessageDigest.isEqual` in Java, `hmac.compare_digest` in Python).
- All services reject empty, short (<16 chars), or known placeholder secrets (`change-me-shared-secret`) at startup when `APP_ENV` is not `development` or `test`.
- Generate unique per-service secrets with `openssl rand -hex 24`.

---

## 4. Provider API Key Encryption & Safe Rotation (`rag-service`)

- Provider API keys persisted in PostgreSQL (`provider_accounts.encrypted_api_key`) are encrypted using `cryptography.fernet.MultiFernet` (`app/security/encryption.py`).
- Startup validation (`app/config.py`) rejects missing, placeholder, or short (<32 chars) `AI_KEY_ENCRYPTION_SECRET` values outside `development`/`test`.
- **Safe Key Rotation**:
  1. Generate a new Fernet key:
     ```bash
     python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
     ```
  2. Set `AI_KEY_ENCRYPTION_SECRET` to the new key and move the previous key(s) into `AI_KEY_ENCRYPTION_PREVIOUS_SECRETS` (comma-separated).
  3. Restart `rag-service`. Existing rows decrypt transparently via `MultiFernet`, and new writes or `rotate_encrypted_key()` calls re-encrypt with the primary key.
  4. Once all stored ciphertexts have been re-encrypted, remove retired keys from `AI_KEY_ENCRYPTION_PREVIOUS_SECRETS`.

---

## 5. Content Sanitization (DOCX HTML, Markdown & URLs)

- **DOCX HTML (`docx-viewer.tsx`)**: HTML produced by `mammoth` is sanitized via `sanitizeDocxHtml()` (`frontend/src/lib/security/sanitize.ts`) using DOMPurify with strict tag/attribute allowlists, forbidding `<script>`, `<iframe>`, `<svg>`, `<style>`, `<form>`, inline `style`, and all `on*` event handlers, followed by DOM-level URL protocol validation on every `<a href>` and `<img src>`.
- **Markdown & AI Responses (`markdown-viewer.tsx`, `ai-message-renderer.tsx`)**: Raw HTML injection (`rehype-raw`) is removed. Rendering enforces `rehype-sanitize` (`MARKDOWN_SANITIZE_SCHEMA`) and `sanitizeUrl()`, rejecting `javascript:`, `vbscript:`, `data:text/html`, and protocol-relative (`//...`) URLs.
- **Email Templates (`notification-service`)**: User-supplied fields (`username`, `verification_code`) are escaped with `html.escape()` prior to HTML template interpolation.

---

## 6. Container & Infrastructure Hardening

- **No Default Credentials**: Base `docker-compose.yml` requires explicit environment variables (`${VAR:?must be set}`) for all PostgreSQL instances, Redis (`--requirepass`), Qdrant (`QDRANT__SERVICE__API_KEY`), gRPC secrets, and encryption keys.
- **Minimal Network Exposure**: Base `docker-compose.yml` exposes only `api-gateway` (`8080`) and `frontend` (`3000`). Databases, Kafka, Redis, Qdrant, TEI, and internal gRPC/HTTP microservice ports remain private to the Docker bridge network. Local development debugging ports are isolated to `docker-compose.dev.yml` and bound strictly to `127.0.0.1`.
- **Non-Root Containers & Health Checks**: All Java, Python, and Next.js Dockerfiles execute as dedicated non-root users (`appuser`, `raguser`, `notifuser`, `nextjs`) and declare `HEALTHCHECK` probes.
- **Fail-Closed File Authorization**: `rag-service` verifies file ownership/sharing via `file-service` gRPC (`AuthorizeFilesForUser`) and denies access whenever authorization fails or is unreachable.
