**How To Communicate With AI Endpoints (frontend guide)**

This document describes the gateway internal AI endpoints that the frontend may call (gateway exposes a public rewrite from `/api/ai/**` → `/api/internal/ai/**` in `application.yml`). For each endpoint: purpose, required headers, request body example, expected response shape, HTTP status codes and common errors.

**Global headers**
- **`Authorization`**: Required. Format: `Bearer <JWT_TOKEN>` — used for user identity and authorization.
- **`X-Correlation-ID`**: Optional. Any string/UUID. If omitted, gateway will generate/propagate one; useful for tracing requests across services.

**Notes on errors**
- gRPC errors from upstream are mapped by the gateway to HTTP statuses via `GrpcExceptionMapper`.
  - INVALID_ARGUMENT → `400 Bad Request` ("Request validation failed")
  - UNAUTHENTICATED → `401 Unauthorized` ("Authentication required")
  - PERMISSION_DENIED → `403 Forbidden` ("Insufficient permissions")
  - NOT_FOUND → `404 Not Found` ("Resource not found")
  - ALREADY_EXISTS / ABORTED → `409 Conflict` ("Request conflicts with current resource state")
  - RESOURCE_EXHAUSTED → `429 Too Many Requests` ("Too many requests")
  - DEADLINE_EXCEEDED → `504 Gateway Timeout` ("Upstream service timeout")
  - UNAVAILABLE → `503 Service Unavailable` ("Upstream service unavailable")
  - Default → `502 Bad Gateway` ("Upstream service error")
- Spring validation annotations on request DTOs will return `400` for invalid input.
- Unexpected errors may return `500` or `502` depending on source.

---

**Endpoints**

**1) List AI models**
- **Path / Method**: `GET /api/internal/ai/models`
- **Purpose**: Retrieve all defined AI models (basic metadata used to populate model selectors).
- **Headers**: `Authorization` required; `X-Correlation-ID` optional.
- **Query params**: none.
- **Request body**: none.
- **Response (200)**: JSON array of `AiModelResponse` objects.
  - Example:

```json
[
  {
    "modelId": "m_123",
    "modelName": "Gemini-Advanced",
    "family": "gemini",
    "contextLength": 8192,
    "capabilitiesJson": "{...}",
    "active": true,
    "providerCount": 2
  }
]
```
- **Errors**: `401`, `403`, `503`, `502`, `400` (rare if headers malformed).

**2) Create AI model**
- **Path / Method**: `POST /api/internal/ai/models`
- **Purpose**: Add a new model definition to the system (admin/authorized use).
- **Headers**: `Authorization` required; `X-Correlation-ID` optional.
- **Request body (JSON)**: fields from `AiModelCreateRequest`:
  - `modelName` (string, required, max 120)
  - `family` (string, required, max 80)
  - `contextLength` (int, >=0)
  - `capabilitiesJson` (string, optional JSON text)
  - `active` (boolean)

- **Example request**:

```json
{
  "modelName": "Gemini-Advanced",
  "family": "gemini",
  "contextLength": 8192,
  "capabilitiesJson": "{\"streams\":true}",
  "active": true
}
```
- **Response (201 Created)**: single `AiModelResponse` object (same shape as list elements).
- **Errors**: `400` (validation failed), `401`, `403`, `409` (already exists), `502/503`.

**3) Attach provider to model (create provider for a model)**
- **Path / Method**: `POST /api/internal/ai/providers`
- **Purpose**: Link a provider and its model name to an AI model (priority config).
- **Headers**: `Authorization` required; `X-Correlation-ID` optional.
- **Request body (JSON)**: `AiProviderAttachRequest` fields:
  - `modelId` (string, required)
  - `providerName` (string, required, max 40)
  - `providerModelName` (string, required, max 120)
  - `priority` (int, >=0)
  - `active` (boolean)

- **Example request**:

```json
{
  "modelId": "m_123",
  "providerName": "openai",
  "providerModelName": "gpt-4o-mini",
  "priority": 10,
  "active": true
}
```
- **Response (201 Created)**: `AiProviderResponse` object:

```json
{
  "providerId": "p_456",
  "modelId": "m_123",
  "providerName": "openai",
  "providerModelName": "gpt-4o-mini",
  "priority": 10,
  "active": true
}
```
- **Errors**: `400` (validation), `401`, `403`, `404` (model not found), `409` (conflict), `502/503`.

**4) Create provider account (store provider API key / account)**
- **Path / Method**: `POST /api/internal/ai/accounts`
- **Purpose**: Register an API key/account for a provider (rate limits/quotas tracked).
- **Headers**: `Authorization` required; `X-Correlation-ID` optional.
- **Request body (JSON)**: `AiProviderAccountCreateRequest` fields:
  - `providerName` (string, required)
  - `accountLabel` (string, required)
  - `apiKey` (string, required)
  - `rateLimitPerMinute` (int >=1)
  - `dailyQuota` (int >=1)
  - `active` (boolean)

- **Example request**:

```json
{
  "providerName": "openai",
  "accountLabel": "team-key-01",
  "apiKey": "sk-xxxx",
  "rateLimitPerMinute": 60,
  "dailyQuota": 10000,
  "active": true
}
```
- **Response (201 Created)**: `AiProviderAccountResponse` object:

```json
{
  "accountId": "a_789",
  "providerName": "openai",
  "accountLabel": "team-key-01",
  "rateLimitPerMinute": 60,
  "dailyQuota": 10000,
  "usedToday": 0,
  "lastUsedAt": null,
  "lastResetAt": null,
  "active": true,
  "healthStatus": "OK"
}
```
- **Errors**: `400`, `401`, `403`, `404` (provider not found), `409`, `502/503`.

**5) List providers**
- **Path / Method**: `GET /api/internal/ai/providers`
- **Purpose**: Retrieve providers (optionally filtered by `modelId`).
- **Headers**: `Authorization` required; `X-Correlation-ID` optional.
- **Query params**:
  - `modelId` (optional) — filter providers attached to a model.
- **Response (200)**: JSON array of `AiProviderResponse` objects.
- **Errors**: `400`, `401`, `403`, `502/503`.

**6) List provider accounts**
- **Path / Method**: `GET /api/internal/ai/accounts`
- **Purpose**: Get provider accounts (optionally filtered by `providerName`).
- **Headers**: `Authorization` required; `X-Correlation-ID` optional.
- **Query params**:
  - `providerName` (optional) — filter accounts for a provider.
- **Response (200)**: array of `AiProviderAccountResponse` objects.
- **Errors**: `400`, `401`, `403`, `502/503`.

**7) Start an AI execution (core endpoint)**
- **Path / Method**: `POST /api/internal/ai/executions`
- **Purpose**: Start a new AI execution request. This call is proxied to the RAG service and returns an accepted token and stream key for results (async/streamed handling).
- **Headers**: `Authorization` required; `X-Correlation-ID` optional.
- **Request body (JSON)**: `StartAiExecutionRequest` fields:
  - `requestId` (string, optional) — client-provided id; gateway will generate a UUID if missing.
  - `prompt` (string, required) — main prompt text.
  - `mode` (string, optional) — `chat` or `deep` (default `deep`).
  - `aiModelId` (string, optional) — target model id.
  - `fileIds` (array[string], optional) — list of file ids to include in context.
  - `chatroomId` (string, optional)
  - `messageId` (string, optional)
  - `options` (map<string,string>, optional) — provider/timeout hints.

- **Example request**:

```json
{
  "prompt": "Summarize the attached files and highlight action items.",
  "mode": "deep",
  "aiModelId": "m_123",
  "fileIds": ["file-1","file-2"],
  "options": { "temperature": "0.2", "max_tokens": "800" }
}
```

- **Response (202 Accepted)**: `StartAiExecutionResponse` object with fields:
  - `status` (string) — service status text
  - `requestId` (string) — the effective request id
  - `streamKey` (string) — key used to subscribe to streaming results (if applicable)
  - `accepted` (boolean)

- **Example response**:

```json
{
  "status": "ACCEPTED",
  "requestId": "c2f6d9e8-...",
  "streamKey": "stream-abc-123",
  "accepted": true
}
```

- **Errors**: `400` (missing/invalid `prompt`), `401`, `403`, `429` (rate limits), `504`/`503` (upstream issues), `502`.

---

**Frontend usage tips**
- Use `Authorization: Bearer <token>` header on every call.
- Provide `X-Correlation-ID` for tracing; otherwise the gateway will set one.
- Prefer calling the public path `/api/ai/...` (gateway rewrites to `/api/internal/ai/...` per `application.yml`).
- For `POST /executions`, be prepared for async/stream behavior: the call only accepts the request and returns a `streamKey` — subscribe to the appropriate websocket or SSE channel used by the app to receive streamed results (check the frontend socket flow for how `streamKey` is consumed).
- Handle mapped error statuses described above and show friendly messages to users (e.g., 401 → ask to re-login, 429 → show retry later, 503/502/504 → show service unavailable message).

If you want, I can also add example `fetch()` snippets for each endpoint tailored to the frontend codebase conventions. 
