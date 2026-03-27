# Unified AI Execution Refactor Plan

## 1. Overview

### Current architecture (as implemented)

- API Gateway forwards HTTP to internal controllers, then to gRPC services:
  - Chat APIs through `api-gateway/src/main/java/com/aiplatform/gateway/controller/GatewayChatController.java`
  - RAG APIs through `api-gateway/src/main/java/com/aiplatform/gateway/controller/GatewayRagController.java`
  - AI model/key APIs through `api-gateway/src/main/java/com/aiplatform/gateway/controller/AiModelController.java`
- Chat message lifecycle is currently:
  1. Persist user message in chat DB (`chat-service/src/main/java/com/aiplatform/chat/service/ChatApplicationService.java`)
  2. Publish AI request event to Kafka (`chat-service/src/main/java/com/aiplatform/chat/service/ChatKafkaPublisher.java`)
  3. RAG consumes Kafka request (`rag-service/app/ingestion/kafka_consumer.py`)
  4. RAG executes pipeline and publishes chunk/final/failure/cancel events to Kafka (`rag-service/app/orchestration/pipeline_executor.py`, `rag-service/app/streaming/response_streamer.py`)
  5. Chat service consumes RAG Kafka events and republishes to Redis Pub/Sub (`chat-service/src/main/java/com/aiplatform/chat/kafka/RagStreamConsumer.java`, `chat-service/src/main/java/com/aiplatform/chat/service/ChatRedisPublisher.java`)
  6. API Gateway subscribes Redis Pub/Sub and exposes WebSocket/SSE (`api-gateway/src/main/java/com/aiplatform/gateway/websocket/ChatRedisSubscriber.java`, `api-gateway/src/main/java/com/aiplatform/gateway/websocket/ChatWebSocketHandler.java`, `api-gateway/src/main/java/com/aiplatform/gateway/controller/GatewayChatController.java`)
- RAG currently has no business FastAPI endpoints for execution; business ops are gRPC + Kafka background consumer (`rag-service/app/main.py`, `rag-service/app/grpc/ai_models_server.py`).
- Redis is currently Pub/Sub channel-based in chat/gateway, not Redis Streams.

### Target architecture

- Chat mode:
  - Client -> API Gateway -> Chat Service -> gRPC streaming -> RAG Service
  - RAG writes chunk/final events to Redis Streams key `stream:chat:{chatroom_id}`
  - Gateway consumes Redis Streams and pushes to clients
  - Chat service owns final message persistence for AI messages
- Direct AI mode:
  - Client -> API Gateway -> RAG Service (direct execution)
  - RAG emits stage/chunk/final to Redis Streams key `stream:ai:{request_id}`
  - RAG persists final direct-mode execution result in its own DB

---

## 2. API Gateway Changes

### 2.1 New routes to add

1. Direct AI execution endpoints (new controller; keep `AiModelController` for model/key APIs):
   - `POST /api/internal/ai/executions` (start direct mode)
   - `GET /api/internal/ai/executions/{requestId}/stream` (SSE stream from Redis Streams)
   - Optional: `POST /api/internal/ai/executions/{requestId}/cancel`
2. Add external rewrites in `api-gateway/src/main/resources/application.yml`:
   - `/api/ai/executions/** -> /api/internal/ai/executions/**`

### 2.2 Existing routes to modify

- Chat SSE route (`/api/internal/chat/messages/{messageId}/stream`) in `GatewayChatController`:
  - Replace Pub/Sub subscription calls (`ChatRedisSubscriber.subscribeToAiStream`) with Redis Stream reader logic keyed by chatroom stream.
- WebSocket stream path (`/ws/chat`) in `ChatWebSocketHandler`:
  - Replace `subscribeToAiEvents` Pub/Sub wiring with Redis Stream polling/consumer-group reads.
- Keep auth model unchanged:
  - Continue JWT validation in `JwtGlobalFilter` and principal derivation in `GatewayPrincipalResolver`.

### 2.3 Routing logic (chat vs direct AI)

- Chat-mode request remains `POST /api/chat/messages` with `chatroomId`/`aiModelId`.
- Direct mode request uses dedicated AI execution route and includes mode + execution options.
- Avoid overloading existing `/api/internal/rag/*` ingest/retrieve vector endpoints; direct execution belongs in AI execution controller.

### 2.4 Request/response contract changes

- Add direct execution DTOs under `api-gateway/src/main/java/com/aiplatform/gateway/dto/`:
  - `StartAiExecutionRequest`
  - `StartAiExecutionResponse` (contains `requestId`, `streamKey`, accepted status)
  - `AiExecutionStreamEvent` (for SSE serialization)
- Keep existing chat DTOs stable where possible (`SendChatMessageRequest`, `SendChatMessageResponse`).

---

## 3. Chat Service Changes

### 3.1 Remove Kafka publishing logic

Remove/retire:

- `ChatKafkaPublisher.publishAiMessageRequested` and `publishCancellation` usage path
- `chat-service/src/main/java/com/aiplatform/chat/kafka/RagStreamConsumer.java`
- `chat-service/src/main/java/com/aiplatform/chat/config/KafkaConsumerConfig.java`
- Kafka AI topic config fields in:
  - `chat-service/src/main/java/com/aiplatform/chat/config/KafkaChatTopicProperties.java`
  - `chat-service/src/main/resources/application.yml`

Keep Kafka dependency only if still needed by other non-AI flows; otherwise remove from `chat-service/pom.xml`.

### 3.2 Add gRPC client for RAG service

Add in chat service:

- gRPC client config for rag-service in `chat-service/src/main/resources/application.yml`
- New properties class for rag service secret, similar to existing chat/file properties
- New client component (for metadata attachment + API invocation), e.g.:
  - `chat-service/src/main/java/com/aiplatform/chat/service/RagExecutionClient.java`

### 3.3 Modify message lifecycle

Current state: AI request is Kafka event after user message persistence.

Target state:

1. User message persisted (unchanged).
2. If AI requested (`aiModelId` present), create AI placeholder message immediately in chat DB (status pending, same chatroom).
3. Invoke RAG gRPC streaming RPC directly from chat service using placeholder AI `message_id`.
4. For each streamed chunk from gRPC:
   - append to in-memory accumulator and
   - write event to Redis Stream `stream:chat:{chatroom_id}` with stable `message_id`.
5. On final event:
   - persist final AI message content to placeholder row and mark completed.
6. On failure/cancel:
   - persist terminal status/error metadata and emit terminal stream event.

### 3.4 Redis integration (Streams)

- Add stream publisher service in chat-service, separate from Pub/Sub:
  - `ChatRedisStreamPublisher` with XADD operations using `StringRedisTemplate.opsForStream()`.
- Event append should include deterministic fields (`event_type`, `message_id`, `sequence`, timestamps).
- Keep existing Pub/Sub publisher temporarily under feature flag during migration.

### 3.5 Schema updates

Current message schema has no AI lifecycle status fields and requires `sender_user_id` non-null:
- `chat-service/src/main/resources/db/migration/V1__init_chat.sql`
- `chat-service/src/main/java/com/aiplatform/chat/domain/MessageEntity.java`

Add migration(s):

- `messages.message_type` (USER | AI)
- `messages.status` (PENDING | STREAMING | COMPLETED | FAILED | CANCELLED)
- `messages.request_id` (for traceability, optional)
- `messages.error_message` nullable
- Optional: `messages.ai_parent_message_id` linking AI response to user prompt

For first-class AI participant requirement:

- Option A (minimal schema change): use a synthetic system UUID in `sender_user_id` + `message_type=AI`.
- Option B (more explicit): allow nullable `sender_user_id` for AI and rely on `message_type`.
- Recommended incremental choice: Option A to avoid breaking existing not-null assumptions.

---

## 4. RAG Service Changes

### 4.1 Execution layer

Files to change:

- `rag-service/app/orchestration/pipeline_executor.py`
- `rag-service/app/orchestration/planner_agent.py`
- `rag-service/app/orchestration/workflow_builder.py`

Add execution mode support:

- `mode = chat | deep`
- `chat` mode behavior:
  - lightweight planning path (fewer agents; optionally skip heavy retrieval when no files)
  - lower latency defaults
- `deep` mode behavior:
  - existing full pipeline behavior

Implementation approach:

- Introduce execution context object in pipeline executor with mode + stream metadata.
- Split existing `_run_pipeline` into:
  - `_run_chat_pipeline(...)`
  - `_run_deep_pipeline(...)`

### 4.2 Streaming layer

Current streamer is Kafka-specific (`rag-service/app/streaming/response_streamer.py`).

Refactor to abstraction:

- `rag-service/app/streaming/sinks/base.py` -> `StreamSink` interface
- `rag-service/app/streaming/sinks/redis_stream_sink.py` -> new Redis Streams implementation
- `rag-service/app/streaming/sinks/kafka_sink.py` -> optional temporary compatibility sink
- `rag-service/app/streaming/response_streamer.py` becomes orchestrator that delegates to configured sink

Add dependencies:

- Redis Python client in `rag-service/requirements.txt` (for Redis Streams XADD/XTRIM)

### 4.3 gRPC server

Current RAG proto lacks execution RPCs (`proto/rag.proto`).

Add new endpoints:

- Chat path (called by chat-service):
  - `rpc ExecuteChat(ExecuteChatRequest) returns (stream ExecutionEvent);`
- Direct path (called by gateway):
  - `rpc ExecuteDirect(ExecuteDirectRequest) returns (ExecuteAcceptedResponse);`
  - Optional `rpc StreamExecution(StreamExecutionRequest) returns (stream ExecutionEvent);` if server-streaming needed in addition to Redis stream.

Update:

- `proto/rag.proto` and `rag-service/proto/rag.proto`
- `rag-service/app/grpc/ai_models_server.py` with handlers for new methods
- Metadata auth remains via existing `_require_service_auth`.

### 4.4 API layer

Current FastAPI app has only ops endpoints (`/health`, `/ready`) and no API router usage.

Add direct execution HTTP entrypoint for gateway compatibility if desired:

- `rag-service/app/api/execution.py`
- include router in `rag-service/app/main.py`
- endpoints:
  - `POST /internal/executions`
  - `GET /internal/executions/{request_id}/stream` (optional if gateway reads Redis directly)

Decision note:

- If standardizing on gRPC service-to-service, direct HTTP layer can remain thin or omitted.
- If required by target architecture statement (Gateway -> RAG directly), gRPC direct call is sufficient and preferred for consistency.

### 4.5 Persistence (direct mode only)

Current DB models are for model catalog + user keys only (`rag-service/app/models/*`).

Add tables/models for direct execution history:

- `ai_executions`:
  - `request_id`, `user_id`, `mode`, `prompt`, `status`, `model_id`, `model_used`, `created_at`, `completed_at`
- `ai_execution_results`:
  - `request_id`, `final_content`, `citations_json`, `usage_json`, `error_message`

Add SQLAlchemy models + migration/init path:

- extend `rag-service/app/models/`
- update `rag-service/app/db/session.py` init routines

---

## 5. Redis Stream Design

## 5.1 Key naming

- Chat mode stream key: `stream:chat:{chatroom_id}`
- Direct mode stream key: `stream:ai:{request_id}`

## 5.2 Event schema

Required fields for each stream entry:

- `event_type`: `chunk | final | stage | error | cancelled`
- `request_id`
- `message_id` (mandatory for chat mode)
- `sequence` (monotonic integer per request)
- `ts` (ISO timestamp)
- `payload` (JSON string)

Payload examples:

- `chunk`: `content_delta`, optional `citations`
- `final`: `final_content`, `usage`, `model_used`, `citations`
- `stage` (direct mode): `stage_name`, `stage_status`, optional progress percent

## 5.3 Lifecycle

- Chat: `chunk* -> final | error | cancelled`
- Direct: `stage* -> chunk* -> final | error | cancelled`

## 5.4 Consumer expectations

- Gateway SSE/WebSocket should:
  - read in order using Redis stream IDs
  - tolerate duplicate delivery by de-duplicating on `(request_id, sequence, event_type)`
  - resume from last delivered ID for reconnect support
- Use bounded retention:
  - `XADD ... MAXLEN ~ N` or periodic trim policy

---

## 6. Data Contracts

### 6.1 Chat Message Schema

Current chat message (`proto/chat.proto` -> `MessageDto`) remains base contract.

Add/extend fields (backward-compatible optional fields):

- `message_type` (USER | AI)
- `status` (PENDING/STREAMING/COMPLETED/FAILED/CANCELLED)
- `request_id`
- `error_message`
- `parent_message_id` (user prompt link)

### 6.2 AI Streaming Event Schema

Canonical stream event (Redis value payload):

```json
{
  "event_type": "chunk",
  "request_id": "...",
  "message_id": "...",
  "chatroom_id": "...",
  "sequence": 12,
  "ts": "2026-03-26T12:00:00Z",
  "payload": {
    "content_delta": "...",
    "citations": []
  }
}
```

Terminal final:

```json
{
  "event_type": "final",
  "request_id": "...",
  "message_id": "...",
  "sequence": 999,
  "payload": {
    "final_content": "...",
    "usage": {"input_tokens": 123, "output_tokens": 456},
    "model_used": "...",
    "citations": []
  }
}
```

### 6.3 gRPC Request/Response Schema

Proposed additions to RagService:

- `ExecuteChatRequest`
  - `chatroom_id`, `message_id`, `user_id`, `content`, `ai_model_id`, `file_ids`, `context_window`, `mode=chat`, `options`
- `ExecuteDirectRequest`
  - `request_id`, `user_id`, `prompt`, `mode=deep|chat`, `ai_model_id`, `file_ids`, `options`
- `ExecutionEvent`
  - `event_type`, `request_id`, `message_id`, `sequence`, `content_delta`, `final_content`, `stage`, `error`, `done`
- `ExecuteAcceptedResponse`
  - `request_id`, `stream_key`, `accepted`

Also adjust ChatService proto:

- replace placeholder `StreamMessageResponse` behavior with real implementation or deprecate if gateway reads Redis directly.

---

## 7. Migration Strategy

### Phase 0: Contract-first groundwork

1. Update shared proto files in root `proto/` for new RAG execution RPCs and event contracts.
2. Regenerate stubs in Java and Python services.
3. Introduce feature flags:
   - `chat.ai.transport= kafka|grpc`
   - `stream.backend= pubsub|redis_stream`
   - `rag.execution.mode.default=deep`

### Phase 1: Introduce Redis Streams in parallel

1. Add Redis Stream publishers in chat and RAG while retaining existing Pub/Sub/Kafka path.
2. Gateway reads both old Pub/Sub and new Stream path behind flag.
3. Verify ordering + reconnection behavior in lower environments.

### Phase 2: Chat -> RAG gRPC cutover

1. Implement chat-service gRPC call to RAG execution.
2. Disable Kafka AI request publishing in chat-service (flag controlled).
3. Keep RAG Kafka consumer for rollback only.

### Phase 3: Direct AI mode enablement

1. Add gateway direct execution endpoints.
2. Add RAG direct execution persistence tables/models.
3. Enable `stream:ai:{request_id}` consumption in gateway SSE.

### Phase 4: Cleanup

1. Remove deprecated Kafka topics/config/classes from chat and RAG AI execution path.
2. Remove dead code (`RagStreamConsumer`, Kafka topic properties for chunk/final streams).
3. Finalize docs and runbooks.

### Backward compatibility considerations

- Keep existing public chat endpoints stable.
- Make new proto fields optional and additive.
- Maintain temporary dual-write/dual-read path until rollout completion.

---

## 8. Risks and Edge Cases

1. RAG crash mid-stream
   - Mitigation: emit `error` terminal event on exception boundaries; chat service marks AI message FAILED if no final event within timeout.
2. Redis disconnects / transient failures
   - Mitigation: retry with backoff on XADD; monitor stream lag; fallback to persisted final state fetch.
3. Partial responses
   - Mitigation: placeholder AI message status transitions, timeout watchdog, explicit cancellation semantics.
4. Duplicate messages/events
   - Mitigation: include `request_id + sequence`; consumers enforce idempotency.
5. Ordering guarantees
   - Mitigation: single producer per request and monotonic sequence assignment before XADD.
6. Cancellation races
   - Mitigation: if cancel arrives after completion, treat as no-op and return deterministic status.
7. Message identity mismatch
   - Mitigation: enforce one AI stream per `message_id`; validate incoming chunk message_id before append.

---

## 9. Optional Improvements

1. Session context for direct mode
   - Add optional `session_id` and retrieval of recent direct executions as context window.
2. Model policy by mode
   - Allow per-mode defaults: fast/cheap model for `chat`, richer model for `deep`.
3. Rate limiting
   - Add dedicated route limits for `/api/ai/executions` and stream endpoints in gateway config.
4. Observability
   - Correlation IDs propagated end-to-end (gateway -> chat/rag -> redis events)
   - Metrics: stream lag, chunk count, completion latency, failure rate per mode/model.

---

## File/Module Change Matrix

## API Gateway

- Modify
  - `api-gateway/src/main/java/com/aiplatform/gateway/controller/GatewayChatController.java`
  - `api-gateway/src/main/java/com/aiplatform/gateway/websocket/ChatRedisSubscriber.java`
  - `api-gateway/src/main/java/com/aiplatform/gateway/websocket/ChatWebSocketHandler.java`
  - `api-gateway/src/main/resources/application.yml`
- Add
  - `api-gateway/src/main/java/com/aiplatform/gateway/controller/GatewayAiExecutionController.java`
  - `api-gateway/src/main/java/com/aiplatform/gateway/service/RedisStreamReaderService.java`
  - New DTOs under `api-gateway/src/main/java/com/aiplatform/gateway/dto/`

## Chat Service

- Remove/deprecate
  - `chat-service/src/main/java/com/aiplatform/chat/kafka/RagStreamConsumer.java`
  - `chat-service/src/main/java/com/aiplatform/chat/config/KafkaConsumerConfig.java`
- Modify
  - `chat-service/src/main/java/com/aiplatform/chat/service/ChatApplicationService.java`
  - `chat-service/src/main/java/com/aiplatform/chat/grpc/ChatGrpcService.java`
  - `chat-service/src/main/resources/application.yml`
  - `chat-service/src/main/java/com/aiplatform/chat/domain/MessageEntity.java`
  - `chat-service/src/main/resources/db/migration/` (new migration)
- Add
  - `chat-service/src/main/java/com/aiplatform/chat/service/RagExecutionClient.java`
  - `chat-service/src/main/java/com/aiplatform/chat/service/ChatRedisStreamPublisher.java`

## RAG Service

- Modify
  - `rag-service/app/orchestration/pipeline_executor.py`
  - `rag-service/app/streaming/response_streamer.py`
  - `rag-service/app/grpc/ai_models_server.py`
  - `rag-service/app/config.py`
  - `rag-service/app/main.py`
  - `rag-service/requirements.txt`
  - `rag-service/proto/rag.proto`
  - `proto/rag.proto`
- Add
  - `rag-service/app/streaming/sinks/base.py`
  - `rag-service/app/streaming/sinks/redis_stream_sink.py`
  - `rag-service/app/models/ai_execution.py` (or split models)
  - `rag-service/app/api/execution.py` (if HTTP direct endpoint retained)

---

## Acceptance Criteria for Implementation Phase

1. Chat AI requests no longer require Kafka request/response topics.
2. Redis Streams carry all real-time AI events for both modes.
3. Chat mode maintains one stable AI `message_id` across all chunks and final persistence.
4. Direct mode stores final result in RAG DB and streams stage/chunk/final events by `request_id`.
5. Gateway supports reconnect-safe stream consumption for chat and direct AI routes.
6. Existing non-AI chat and file/vector operations remain backward compatible.
