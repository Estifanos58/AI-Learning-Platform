# How Current AI Models Work in `rag-service`

This document explains how AI models are stored, seeded, retrieved, and used by `rag-service` from startup to final streamed response.

It follows the actual code paths in the repository and focuses on the model lifecycle, provider selection, and the request pipeline.

## 1. What is stored in the database

`rag-service` keeps model metadata in the `ai_models` table through the `AIModel` SQLAlchemy model.

Each row stores:

- `id`: UUID string primary key
- `model_name`: the public model name shown to clients
- `provider`: the backend provider name such as `openai` or `gemini`
- `description`: optional human-readable description
- `context_length`: maximum context size
- `supports_streaming`: whether the model can stream
- `platform_key_available`: whether a platform API key is configured for that provider
- `encrypted_platform_key`: encrypted platform key stored on the row
- `active`: whether the model is currently available for listing and use
- timestamps: `created_at` and `updated_at`

User-specific API keys are stored separately in the `user_ai_api_keys` table.

That table stores:

- `user_id`
- `model_id`
- `encrypted_api_key`
- `is_active`

So the system has two different key layers:

1. Platform keys, which belong to the deployment and are copied into `ai_models`.
2. User keys, which belong to a specific user and model pair.

## 2. How models get into the database

Model rows are created during startup in `app/db/session.py`.

### Step 1: create tables and schema

`init_database()` calls `ensure_ai_models_schema()`.

That function:

- creates tables from SQLAlchemy metadata
- adds the `encrypted_platform_key` and `platform_key_available` columns if they are missing
- normalizes `platform_key_available` so it is never null

### Step 2: seed default AI models

`seed_default_ai_models()` builds the default model list from the current settings.

If a row does not exist, it is inserted.
If a row already exists, selected fields are updated in place.

That means model seeding is idempotent and safe to run on every startup.

### Step 3: sync platform API keys into the model rows

`sync_platform_keys()` reads API keys from settings or environment variables, encrypts them, and stores them on the matching `ai_models` rows.

If a provider does not have a configured platform key, the row is cleared and `platform_key_available` is set to false.

## 3. Current default AI models

With the checked-in defaults, the service seeds these model definitions:

| Model name | Provider | Notes |
|---|---|---|
| `gpt-4o-mini` | `openai` | Default OpenAI model in settings |
| `gemini-3.0` | `gemini` | Default Gemini model in settings |
| `deepseek-chat` | `deepseek` | Default DeepSeek model |
| `llama-3.3-70b-versatile` | `groq` | Default Groq model |
| `openai/gpt-4o-mini` | `openrouter` | Default OpenRouter model |
| `mistral` | `local` | Default local model |

There is also a second OpenAI entry based on the `OPENAI_MODEL` setting. In the default config that value is also `gpt-4o-mini`, so the seeding code deduplicates it by model name.

Important detail:

- the seed list is built from settings
- the code deduplicates by `model_name`
- if environment variables change, the stored model list changes with them

## 4. How clients retrieve the model list

The gRPC service in `app/grpc/ai_models_server.py` exposes `ListModels`.

### Step 1: authenticate the request

`_require_service_auth()` checks:

- `x-service-secret`
- `x-user-id`

If either is invalid, the request is rejected.

### Step 2: fetch active models

`AIModelRepository.list_active_with_user_key_flag(user_id)` performs the query.

It returns only rows where:

- `ai_models.active = true`

It also joins `user_ai_api_keys` for the current user and adds a `user_key_configured` flag.

### Step 3: return client-ready DTOs

The gRPC response includes:

- `model_id`
- `model_name`
- `provider`
- `context_length`
- `supports_streaming`
- `user_key_configured`
- `platform_key_available`
- `description`

So the UI can tell whether a model is available through the platform, through the user’s own key, or both.

## 5. How user API keys are uploaded and stored

The same gRPC service also exposes:

- `CreateUserApiKey`
- `UpdateUserApiKey`
- `DeleteUserApiKey`

### Upload flow

1. The request is authenticated with the service secret and user ID.
2. The model ID is validated against `ai_models`.
3. The raw API key is encrypted with `encrypt_key()`.
4. `UserKeyRepository.upsert()` writes the encrypted value into `user_ai_api_keys`.

### Delete flow

1. The request is authenticated.
2. The active user key row is looked up by `user_id` and `model_id`.
3. The row is deleted if it exists.

So user keys are not stored on the model row. They are stored in a separate table and only resolved at request time.

## 6. How the service chooses a provider

Provider routing is handled by `app/llm/provider_router.py`.

Supported providers:

- `openai`
- `gemini`
- `openrouter`
- `groq`
- `deepseek`
- `local`

### Routing rules

1. If `preferred_provider` is set, the router uses that provider alias directly.
2. If a model name is provided, the router matches keywords in the model name:
   - `gpt` or `openai` -> `openai`
   - `gemini` or `google` -> `gemini`
   - `openrouter` or `open-router` -> `openrouter`
   - `groq` -> `groq`
   - `deepseek` -> `deepseek`
   - `local`, `ollama`, `mistral`, `llama` -> `local`
3. If an explicit provider or model is unavailable, the router can fall back to the first available provider when fallback is allowed.
4. The fallback preference order is:
   - `openai`
   - `gemini`
   - `openrouter`
   - `groq`
   - `deepseek`
   - `local`

### Availability checks

Each provider reports availability from deployment settings:

- OpenAI: API key present
- Gemini: API key present
- OpenRouter: API key present
- Groq: API key present
- DeepSeek: API key present
- Local: local LLM base URL present

Gemini has an extra implementation detail:

- it uses the official SDK when available
- if the SDK is missing, it falls back to the REST API

That keeps Gemini usable in environments where the optional dependency is not installed.

## 7. End-to-end request flow

There are two ways a generation request reaches the pipeline:

1. Kafka event path: `ai.message.requested.v2`
2. Direct gRPC path: `ExecuteDirect`

Both paths ultimately call `PipelineExecutor.execute()`.

### 7.1 Kafka path

1. `app/main.py` starts `IngestionConsumer` during FastAPI lifespan startup.
2. The consumer subscribes to `ai.message.requested.v2`.
3. When a message arrives, `_handle_ai_message_requested()` creates `PipelineExecutor`.
4. `PipelineExecutor.execute(payload)` starts the full pipeline.

### 7.2 Direct gRPC path

1. `ExecuteDirect` receives a prompt, model ID, file IDs, and options.
2. The gRPC handler immediately returns an accepted response with a stream key.
3. It starts `PipelineExecutor.execute(payload)` in the background with `asyncio.create_task()`.

## 8. What happens inside `PipelineExecutor.execute()`

This is the core step-by-step flow.

### Step 1: read request identifiers

The executor extracts:

- `request_id`
- `chatroom_id`
- `user_id`
- `model_id`
- optional model name hint
- optional provider hint
- question content
- file IDs
- options
- context window

### Step 2: resolve model metadata from the database

`_resolve_model_info()` looks up the `ai_models` row by `model_id`.

If the request includes a model ID but the row does not exist, the pipeline fails early.

The executor uses the stored database row to recover:

- the canonical model name
- the provider name

This is how requests are tied back to the configured model row instead of trusting only the incoming payload.

### Step 3: resolve the user’s encrypted API key

`_resolve_user_api_key()` checks `user_ai_api_keys` for an active row for the current `user_id` and `model_id`.

If a row exists:

1. the encrypted key is loaded
2. it is decrypted with `decrypt_key()`
3. the plaintext key is passed into the providers for this request only

If no user key exists, the pipeline proceeds with the platform key or provider default.

### Step 4: register cancellation support

The executor creates an in-process cancellation event and stores it in the request registry.

That allows `CancelGeneration` to stop the running request in the same process.

### Step 5: authorize attached file IDs

If the request contains file IDs:

1. `UserPermissionChecker.get_allowed_file_ids()` calls file-service over gRPC.
2. Only authorized file IDs are kept.
3. If authorization fails, the pipeline fails closed and returns no file IDs.

If there are no files, retrieval is skipped.

### Step 6: perform vector search

`VectorSearch.search()`:

1. embeds the user question with `QueryEmbedder`
2. sends the vector to Qdrant
3. filters results to the allowed file IDs

If no authorized file IDs remain, the search returns an empty result set.

### Step 7: rerank the retrieved chunks

`Reranker.rerank()` improves chunk ordering.

It tries:

1. TEI rerank API
2. local cross-encoder fallback
3. original vector order if both reranking approaches fail

### Step 8: create a plan for agents

`PlannerAgent.plan()` decides which agents should run.

It tries LLM-based planning first when model or provider information is available.

If that fails, it falls back to keyword heuristics.

The possible agents are:

- `research`
- `summarize`
- `exam`
- `explanation`
- `citation`
- `tutor`

### Step 9: build the workflow

`WorkflowBuilder.build()` turns the plan into actual agent instances.

It uses a simple registry, so only known agents are instantiated.

### Step 10: run the agents

Each agent receives an `AgentContext` containing:

- request ID
- user ID
- question
- retrieved chunks
- model ID
- model name
- provider name
- user API key
- request options

Each agent then:

1. builds a prompt from the retrieved context
2. routes to the correct provider with `ProviderRouter`
3. streams the model output
4. returns an `AgentResult` with content and citations

### Step 11: aggregate the agent outputs

`ResponseAggregator.aggregate()` combines the agent results.

If one agent ran, it returns that content directly.

If multiple agents ran, it prefixes sections with headers and deduplicates citations.

### Step 12: stream the response out

`ResponseStreamer.publish_chunk()` emits chunk events as the aggregated content is split into smaller pieces.

It also publishes the final completion event through `publish_completed()`.

The active response events are:

- `ai.message.chunk.v2`
- `ai.message.completed.v2`
- `ai.message.failed.v2`
- `ai.message.cancelled.v2`

Depending on configuration, those events go to Kafka, Redis, or both.

### Step 13: estimate usage

Before the completion event is published, `TokenMeter.estimate()` calculates:

- prompt token count
- completion token count
- total token count
- estimated cost

That usage object is included in the completion payload.

## 9. How response streaming works

`ResponseStreamer` builds one or more sinks based on `STREAM_BACKEND`.

Supported backends:

- `kafka`
- `redis`
- `dual`

For each event, the streamer publishes the same payload to every configured sink.

### Kafka sink

Kafka publishing maps event types to topics:

- chunk -> `ai.message.chunk.v2`
- completed -> `ai.message.completed.v2`
- failed -> `ai.message.failed.v2`
- cancelled -> `ai.message.cancelled.v2`

### Redis sink

Redis publishing writes the event to a stream key:

- `stream:chat:<chatroom_id>` when a chatroom ID exists
- `stream:ai:<request_id>` otherwise

## 10. How the generation is selected per request

The selected model depends on the request payload and the stored database model row.

### If the request provides `ai_model_id`

1. the executor resolves the row from `ai_models`
2. the model name and provider are read from the database
3. the agents and planner use those values to route to the right backend

### If the request only provides a model name or provider hint

1. the executor uses the hint as a fallback
2. the provider router tries to infer the provider from the name
3. if no explicit provider can be mapped and fallback is allowed, the router uses the first available provider

### If the user has an uploaded API key

1. the key is resolved from `user_ai_api_keys`
2. the provider uses the user key for that request
3. this can work even when the platform key is missing

## 11. Important implementation notes

- model seeding is startup-driven, not a manual upload API for model rows
- user API keys are the only values uploaded through gRPC in the current implementation
- platform keys are encrypted before being written to `ai_models`
- the Gemini provider has a REST fallback when the optional SDK is missing
- cancellation is in-process, so it works only within the same service instance
- model listing is filtered by `active = true`

## 12. File map

- Model table: [app/models/ai_model.py](app/models/ai_model.py)
- User key table: [app/models/user_ai_api_key.py](app/models/user_ai_api_key.py)
- DB seeding and startup init: [app/db/session.py](app/db/session.py)
- Platform key sync: [app/db/seed_platform_keys.py](app/db/seed_platform_keys.py)
- Model listing and user key gRPC APIs: [app/grpc/ai_models_server.py](app/grpc/ai_models_server.py)
- Provider routing: [app/llm/provider_router.py](app/llm/provider_router.py)
- Pipeline orchestration: [app/orchestration/pipeline_executor.py](app/orchestration/pipeline_executor.py)
- Response streaming: [app/streaming/response_streamer.py](app/streaming/response_streamer.py)
- Kafka consumer entrypoint: [app/ingestion/kafka_consumer.py](app/ingestion/kafka_consumer.py)