# RAG Service Implementation Contract (for AI Coding Agent)

## 1) Purpose
This document defines how to implement a production-ready `rag-service` for this platform and how to update existing services (`file-service`, `chat-service`, `api-gateway`) to support ingestion, retrieval, orchestration, and streaming AI responses.

This is an executable architecture contract for an implementation agent. Follow it in order and preserve backward compatibility where noted.

---

## 2) Current Platform Context (Verified)

### Existing backend services
- `api-gateway` (Spring Boot WebFlux): REST entrypoint + JWT validation + route-level rate limiting.
- `auth-service` (Spring Boot): auth/token flows.
- `user-profile-service` (Spring Boot): profile management.
- `file-service` (Spring Boot gRPC): file/folder CRUD, upload stream, sharing/access checks.
- `chat-service` (Spring Boot gRPC): messages/chatrooms, optional file attachment upload to `file-service`, publishes AI request event.
- `notification-service` (FastAPI): email notifications.
- `rag-service` currently exists only as a placeholder service in `docker-compose` profile `rag`.

### Existing integration points relevant to RAG
- `chat-service` publishes `ai.message.requested` Kafka event when message has `aiModelId`.
- `file-service` can publish `file.uploaded.v1` and `file.deleted.v1` (currently feature-flagged with `APP_KAFKA_FILE_EVENTS_ENABLED`).
- `file-service` stores physical files in shared storage (`FILE_STORAGE_ROOT_PATH=/data` in compose).
- `api-gateway` already routes `/api/chat/**` and `/api/files/**` and forwards metadata headers to gRPC services.

### Existing gaps to close for RAG
1. No concrete RAG runtime/container yet.
2. `file.uploaded` event payload is minimal; ingestion needs richer metadata.
3. No file authorization batch endpoint optimized for RAG retrieval filtering.
4. No RAG response event contract consumed by `chat-service`.
5. No client-visible streaming pathway for generated AI chunks.
6. No cancellation protocol from client -> gateway -> chat -> RAG.

---

## 3) Target User Flows

## A) File ingestion flow
1. User uploads file -> `api-gateway` -> `file-service`.
2. `file-service` publishes `file.uploaded.v2` Kafka event.
3. `rag-service` ingestion consumer receives event.
4. `rag-service` resolves file content (from storage path), extracts text, chunks, embeds, stores vectors in Qdrant.
5. `rag-service` marks ingestion status (`PENDING -> PROCESSING -> COMPLETED|FAILED`) for observability and retry.

## B) AI chat flow with retrieval
1. User sends AI message -> `api-gateway` -> `chat-service`.
2. `api-gateway` sanitizes request content for prompt-injection hardening.
3. `chat-service` stores user message and publishes `ai.message.requested.v2`.
4. `rag-service` orchestrator consumes request, validates file access via `file-service`, retrieves vectors, runs planner + selected agents, aggregates response.
5. `rag-service` publishes streaming chunks (`ai.message.chunk.v1`) and completion (`ai.message.completed.v1`) back to Kafka.
6. `chat-service` consumes chunks/completion, streams to `api-gateway`, `api-gateway` streams to client.
7. On completion, `chat-service` persists assistant message.

## C) Cancellation flow
1. Client cancels generation.
2. `api-gateway` forwards cancel command to `chat-service`.
3. `chat-service` emits `ai.message.cancelled.v1` command.
4. `rag-service` aborts orchestration task and emits terminal cancellation status.

---

## 4) RAG Service Scope

### In scope
- File ingestion (event-driven).
- Text extraction (Kreuzberg-first strategy).
- Chunking + embedding + vector storage.
- Retrieval pipeline with per-user/per-file authorization.
- Planner-driven multi-agent orchestration.
- Response streaming via Kafka.
- Support for multiple LLM providers and user-supplied API keys.
- Token usage metering / credit accounting.

### Out of scope (initial MVP)
- Advanced multimodal pipelines beyond document/image OCR.
- Full external web crawling by default.
- Long-term workflow memory beyond per-request context unless explicitly added.

---

## 5) Required Folder Structure (`rag-service`)

Use this baseline and keep it extensible:

```text
rag-service/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── api/
│   │   └── rag_controller.py
│   ├── orchestration/
│   │   ├── planner_agent.py
│   │   ├── workflow_builder.py
│   │   ├── pipeline_executor.py
│   │   └── response_aggregator.py
│   ├── agents/
│   │   ├── base_agent.py
│   │   ├── research_agent.py
│   │   ├── summarize_agent.py
│   │   ├── exam_agent.py
│   │   ├── explanation_agent.py
│   │   ├── citation_agent.py
│   │   └── tutor_agent.py
│   ├── retrieval/
│   │   ├── query_embedder.py
│   │   ├── vector_search.py
│   │   └── reranker.py
│   ├── ingestion/
│   │   ├── kafka_consumer.py
│   │   ├── file_loader.py
│   │   ├── extractor.py
│   │   ├── chunker.py
│   │   └── embedding_pipeline.py
│   ├── llm/
│   │   ├── provider_router.py
│   │   ├── openai_provider.py
│   │   ├── gemini_provider.py
│   │   ├── deepseek_provider.py
│   │   └── local_provider.py
│   ├── security/
│   │   ├── file_validator.py
│   │   └── user_permission_checker.py
│   ├── streaming/
│   │   └── response_streamer.py
│   ├── usage/
│   │   ├── credits.py
│   │   └── token_meter.py
│   └── storage/
│       ├── qdrant_client.py
│       └── models.py
├── tests/
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## 6) Event Contracts (Versioned)

## 6.1 File upload event for ingestion

### Existing topic
- `file.uploaded.v1` exists but payload is minimal.

### Add new topic/version
- `file.uploaded.v2` (preferred for RAG ingestion).

### Required payload
```json
{
  "event_id": "uuid",
  "event_type": "file.uploaded.v2",
  "timestamp": "2026-03-12T12:00:00Z",
  "payload": {
    "file_id": "uuid",
    "owner_id": "uuid",
    "folder_id": "uuid",
    "file_name": "lecture1.pdf",
    "file_type": "DOCUMENT",
    "content_type": "application/pdf",
    "storage_path": "/data/<owner>/<folder>/<stored>",
    "file_size": 123456,
    "is_shareable": false,
    "tags": [],
    "metadata": {}
  }
}
```

### Headers (required)
- `correlationId`
- `schemaVersion`

## 6.2 AI request event

### Existing topic
- `ai.message.requested` currently contains basic fields.

### Add/upgrade
- `ai.message.requested.v2` with richer context:
```json
{
  "event_id": "uuid",
  "event_type": "ai.message.requested.v2",
  "timestamp": "...",
  "payload": {
    "chatroom_id": "uuid",
    "message_id": "uuid",
    "user_id": "uuid",
    "ai_model_id": "gemini|openai|deepseek|local",
    "content": "question text",
    "file_ids": ["uuid", "uuid"],
    "context_window": [
      {"message_id": "uuid", "role": "user|assistant", "content": "..."}
    ],
    "options": {
      "max_tokens": 2048,
      "temperature": 0.2,
      "stream": true
    }
  }
}
```

## 6.3 AI streaming response events
- `ai.message.chunk.v1`
- `ai.message.completed.v1`
- `ai.message.failed.v1`
- `ai.message.cancelled.v1`

Chunk payload example:
```json
{
  "event_id": "uuid",
  "event_type": "ai.message.chunk.v1",
  "timestamp": "...",
  "payload": {
    "chatroom_id": "uuid",
    "message_id": "uuid",
    "request_id": "uuid",
    "sequence": 12,
    "content_delta": "partial text",
    "citations": [],
    "done": false
  }
}
```

Completion payload includes final text, citations, token usage, model used, latency.

---

## 7) `file-service` Changes Required

## 7.1 Publish richer upload events
- Keep `file.uploaded.v1` for backward compatibility.
- Add `file.uploaded.v2` payload with `folder_id`, `content_type`, `file_size`, `is_shareable`, and stable `storage_path`.

## 7.2 Add batch authorization endpoint for RAG
Add gRPC endpoint (new RPC in `proto/file.proto`):
- `AuthorizeFilesForUser(AuthorizeFilesForUserRequest) returns (AuthorizeFilesForUserResponse)`

Request:
- `user_id`
- `repeated file_ids`

Response:
- `repeated allowed_file_ids`
- optional per-file reason map for denied items

Authorization rule (already aligned with current domain logic):
- allowed if user is owner OR folder is shared with user OR file is explicitly shared with user.

## 7.3 Add metadata fetch endpoint for multiple files (optional but recommended)
- `BatchGetFileMetadata(BatchGetFileMetadataRequest) returns (BatchGetFileMetadataResponse)`

Used by RAG to enrich citations and filtering.

## 7.4 Deletion handling
- Ensure `file.deleted.v1` (or `v2`) is consumed by RAG to remove vectors by `file_id`.

---

## 8) `chat-service` Changes Required

## 8.1 Publish AI request v2
- Continue publishing existing topic temporarily.
- Add publishing of `ai.message.requested.v2` with:
  - `file_ids` (support multiple)
  - context window
  - request options

## 8.2 Consume RAG streaming events
Add Kafka consumers for:
- `ai.message.chunk.v1`
- `ai.message.completed.v1`
- `ai.message.failed.v1`
- `ai.message.cancelled.v1`

Behavior:
1. buffer/order chunks by `request_id` + `sequence`.
2. emit live updates to clients.
3. persist final assistant message only on completion.
4. persist failure/cancel metadata for UI state.

## 8.3 Streaming API to gateway
Add server-streaming gRPC RPC or equivalent event bridge:
- `StreamMessageResponse(StreamMessageRequest) returns (stream MessageChunk)`

Gateway will expose this as SSE/WebSocket-compatible stream.

## 8.4 Cancellation command
Add endpoint/RPC to cancel active generation:
- chat publishes `ai.message.cancelled.v1` command for active `request_id`.

---

## 9) `api-gateway` Changes Required

## 9.1 Prompt-injection sanitization layer
For AI message entry points:
- sanitize/normalize text before forwarding to `chat-service`.
- enforce max size, remove null/control characters, normalize Unicode.
- maintain audit fields (`correlationId`, `sanitizationFlags`).

Do not mutate user intent semantically; perform defensive normalization + policy filtering.

## 9.2 Add streaming endpoint for client
Expose endpoint such as:
- `GET /api/chat/messages/{messageId}/stream`

Gateway should bridge chat streaming to client using SSE (or WebFlux streaming response).

## 9.3 Add cancellation endpoint
- `POST /api/chat/messages/{messageId}/cancel`

Forward to `chat-service`, include auth context + correlation ID.

## 9.4 Rate limiting policy for AI endpoints
Use stricter route limits for streaming/cancel/message generation endpoints to protect model resources.

---

## 10) Ingestion Pipeline Details (`rag-service`)

## 10.1 File loading
- Read from shared file storage path (current compose mounts `file-storage` volume).
- Validate path safety (no traversal), size limits, allowed content types.

## 10.2 Text extraction
Primary extractor: **Kreuzberg**.
- PDF: digital + OCR fallback.
- Office docs: pandoc-backed extraction.
- Images: Tesseract OCR.
- Plain text/code/csv/md direct parsing.

Fallback strategy:
1. extraction attempt with Kreuzberg,
2. if confidence/structure too low and type is table-heavy, route to optional advanced OCR (future extension).

## 10.3 Chunking
- Use `RecursiveCharacterTextSplitter`.
- Suggested defaults:
  - chunk size: 800-1200 chars
  - overlap: 120-200 chars
- Store chunk ordinal + page/source pointers.

## 10.4 Embeddings
- Use Hugging Face TEI with `BAAI/bge-large-en-v1.5` in Docker.
- Include embedding model + version in stored metadata.

## 10.5 Vector storage
- Use Qdrant collection per environment.
- Payload metadata minimum:
  - `chunk_id`, `file_id`, `owner_id`, `user_id`, `folder_id`, `page_number`, `chunk_text`, `tags`, `created_at`, `embedding_model`, `schema_version`.

## 10.6 Idempotency
Define deterministic point id:
- hash(`file_id + chunk_index + extraction_version + embedding_model_version`)

This allows safe re-ingestion on retries.

---

## 11) Retrieval + Authorization Pipeline

For every AI request:
1. Parse requested `file_ids` (or infer from chat context).
2. Call `file-service.AuthorizeFilesForUser(user_id, file_ids)`.
3. Query Qdrant with filter: `file_id in allowed_file_ids` + `owner/shared scope`.
4. Top-K retrieval (e.g. 20), then rerank to final context (e.g. 6-10 chunks).
5. Pass context bundle to planner/workflow.

No retrieved chunk may come from unauthorized files.

---

## 12) Planner + Agent Orchestration

## 12.1 Planner input
- user question
- trigger hints
- available agents + tools
- retrieved context summary

## 12.2 Planner output
- selected agents
- execution order/parallel groups
- tool usage permissions
- final aggregator format

## 12.3 Execution model
- `pipeline_executor` supports mixed parallel/sequential stages.
- each agent returns structured output with confidence + citations.
- `response_aggregator` merges outputs and prepares streamable final response.

## 12.4 Tool system (initial)
- `search_web` (feature-flagged)
- `summarize_file`
- `generate_quiz`
- `compare_documents`

Tool interface must be registry-based (no hardcoded branching by agent name).

---

## 13) LLM Provider Routing + User API Keys

## 13.1 Provider routing
`provider_router` selects provider based on:
1. requested model,
2. user key availability,
3. provider health,
4. quota policy.

## 13.2 User key storage
- Store encrypted provider API keys in Postgres.
- Fields:
  - `id`, `user_id`, `provider`, `encrypted_api_key`, `is_active`, `created_at`, `updated_at`.

## 13.3 Fallback policy
- If user key unavailable/invalid, use platform key only if user quota allows.

---

## 14) AI Credit & Usage Tracking

Track per inference:
- `user_id`
- `request_id`
- `model_used`
- `prompt_tokens`
- `completion_tokens`
- `total_tokens`
- `cost_estimate`
- `timestamp`

Expose this via internal reporting endpoint and metrics.

---

## 15) Security Requirements

1. Strict file authorization via `file-service` before retrieval.
2. Prompt-injection mitigation in gateway and model-side guardrails in RAG.
3. Input size and rate caps on generation endpoints.
4. Correlation IDs propagated end-to-end.
5. No plaintext storage of user AI keys.
6. Secret-based service-to-service authentication for any new gRPC integrations.

---

## 16) Reliability & Observability

## 16.1 Kafka consumer behavior
- manual commit only after successful processing.
- retry with exponential backoff.
- dead-letter topics:
  - `file.uploaded.dlt.v1`
  - `ai.message.requested.dlt.v1`

## 16.2 Metrics
Expose at least:
- ingestion success/fail counts
- chunk extraction latency
- embedding latency
- retrieval latency
- generation latency
- stream chunk throughput
- cancellation count

## 16.3 Logging
Structured logs with:
- `correlationId`, `request_id`, `message_id`, `user_id` (where legal), `service`.

---

## 17) Docker/Runtime Additions

Add concrete containers in compose (not placeholders):
- `rag-service` (FastAPI + worker process)
- `tei` (HF Text Embeddings Inference)
- `qdrant`

`rag-service` needs:
- access to Kafka
- read access to file-storage volume (`/data`)
- access to Qdrant + TEI endpoints
- env vars for topics, provider keys, db, encryption key

---

## 18) Backward Compatibility and Rollout

## Phase 1
- Stand up RAG infrastructure + ingestion only.
- Publish `file.uploaded.v2` in addition to v1.

## Phase 2
- Add `ai.message.requested.v2` publishing from chat.
- RAG generates responses and publishes chunk/completion topics.

## Phase 3
- Chat consumes stream/completion and gateway exposes streaming API.
- Add cancellation end-to-end.

## Phase 4
- Deprecate old event versions after clients/services fully migrated.

---

## 19) Acceptance Criteria

1. Uploading a supported file results in vector records in Qdrant with required metadata.
2. AI request with authorized files returns context-grounded answer with citations.
3. Unauthorized file IDs never appear in retrieval results.
4. Chat client receives streaming chunks and final completion.
5. Cancellation stops generation within bounded time and no final completion is persisted.
6. Usage metrics and token accounting are written for every successful/failed request.

---

## 20) Implementation Notes for Agent

- Prefer additive changes first (new topics, new RPCs, new endpoints), then migrate callers.
- Keep existing topic names/contracts alive until all producers/consumers are dual-wired.
- Reuse existing header conventions: `x-correlation-id`, `x-user-id`, `x-service-secret`.
- Avoid introducing direct DB coupling between services.
- Treat all external model/provider calls as unreliable; design with retries/timeouts/circuit breaking.

---

## 21) Immediate Work Queue (Recommended Order)

1. Replace compose `rag-service` placeholder with real FastAPI container.
2. Add Qdrant + TEI to compose and env wiring.
3. Implement `rag-service` ingestion consumer for `file.uploaded.v2`.
4. Update `file-service` event publisher to emit `file.uploaded.v2`.
5. Add `AuthorizeFilesForUser` RPC to `file-service` and proto.
6. Upgrade `chat-service` to publish `ai.message.requested.v2`.
7. Implement RAG orchestrator + response stream events.
8. Add chat consumer for RAG stream/completion events.
9. Add gateway streaming + cancel endpoints + sanitization filter.
10. Add integration tests for ingestion, auth filtering, and stream completion.
