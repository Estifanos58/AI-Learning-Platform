# How RAG Works

This document explains the end-to-end chat request flow handled by `rag-service` when a user sends a message in `chat-service`, the event is published to Kafka, and `rag-service` turns that event into streamed AI response events.

Scope:
- Primary path: `ai.message.requested.v2`
- Cancellation path: `ai.message.cancelled.v2`
- Related startup plumbing that must be working for the flow to succeed

The document follows the real code path in the repository and focuses on the functions that are actually involved in the request lifecycle.

## 1. Upstream event contract from chat-service

The Kafka message is produced by `chat-service` before `rag-service` ever sees it. The producer builds the request event with these fields:

- event type: `ai.message.requested.v2`
- Kafka key: `chatroom_id`
- payload fields: `chatroom_id`, `message_id`, `user_id`, `ai_model_id`, `content`, `file_ids`, `context_window`, `options`

Relevant producer function:

- [ChatKafkaPublisher.publishAiMessageRequested](../chat-service/src/main/java/com/aiplatform/chat/service/ChatKafkaPublisher.java)

Function contract:

- Input type: `MessageEntity`
- Output type: `void`
- Behavior: if `aiModelId` is missing or the topic is not configured, it returns immediately and does not publish anything
- Exceptions:
  - `JsonProcessingException` is caught internally and only logged
  - Kafka send failures are handled by the Kafka client call site and logged by the producer

The emitted JSON payload matches the structure expected by `rag-service`:

- `payload.chatroom_id: str`
- `payload.message_id: str`
- `payload.user_id: str`
- `payload.ai_model_id: str`
- `payload.content: str`
- `payload.file_ids: list[str]`
- `payload.context_window: list[dict[str, object]]`
- `payload.options: dict[str, object]`

## 2. Service startup and background workers

File: [app/main.py](app/main.py)

`rag-service` starts its Kafka producer, gRPC server, and Kafka consumer in the FastAPI lifespan hook.

### 2.1 `lifespan(app: FastAPI) -> AsyncIterator[None]`

- Input type: `FastAPI`
- Output type: async iterator yielding `None`
- Purpose: initialize Qdrant, PostgreSQL, Kafka producer, gRPC server, and the Kafka consumer thread
- Exceptions:
  - Startup exceptions are caught and logged for Qdrant, database init, Kafka producer, gRPC server, and consumer startup
  - The application keeps running even if one of these dependencies is unavailable

### 2.2 `health() -> JSONResponse`

- Input type: none
- Output type: `JSONResponse`
- Purpose: lightweight liveness probe
- Exceptions: none expected

### 2.3 `readiness() -> JSONResponse`

- Input type: none
- Output type: `JSONResponse`
- Purpose: checks Qdrant availability
- Exceptions:
  - Any Qdrant check failure is caught and converted into a degraded readiness response

## 3. Kafka ingestion entrypoint

File: [app/ingestion/kafka_consumer.py](app/ingestion/kafka_consumer.py)

The Kafka consumer is the first `rag-service` component that sees the AI request event.

### 3.1 `IngestionConsumer.__init__(event_loop: asyncio.AbstractEventLoop) -> None`

- Input type: `asyncio.AbstractEventLoop`
- Output type: `None`
- Purpose: stores the main event loop and creates the background thread
- Exceptions: none expected

### 3.2 `start() -> None`

- Input type: none
- Output type: `None`
- Purpose: starts the background consumer thread
- Exceptions: thread start failures would propagate from `threading.Thread.start()`

### 3.3 `stop() -> None`

- Input type: none
- Output type: `None`
- Purpose: signals the consumer thread to stop and joins it briefly
- Exceptions: none expected

### 3.4 `_run() -> None`

- Input type: none
- Output type: `None`
- Purpose: creates the Kafka consumer, reconnects on failure, and hands control to the poll loop
- Exceptions:
  - `ImportError` for `kafka-python` is handled and disables the consumer
  - Other Kafka connection or runtime failures are caught, logged, and retried with exponential backoff

### 3.5 `_consume_loop(consumer: Any) -> None`

- Input type: Kafka consumer object
- Output type: `None`
- Purpose: polls batches, dispatches each record onto the asyncio loop, and commits offsets after success
- Exceptions:
  - Per-record processing failures are caught, logged, and sent to the dead-letter topic
  - The consumer is always closed in `finally`

### 3.6 `_dispatch(topic: str, payload: Dict[str, Any]) -> None`

- Input types:
  - `topic: str`
  - `payload: dict[str, Any]`
- Output type: `None`
- Purpose: routes the record to the correct topic handler
- Exceptions: none directly; any handler failure is propagated to `_consume_loop`

### 3.7 `_handle_ai_message_requested(event: Dict[str, Any]) -> None`

- Input type: `dict[str, Any]`
- Output type: `None`
- Purpose: instantiates `PipelineExecutor` and starts the RAG pipeline
- Exceptions:
  - Any pipeline exception is handled inside `PipelineExecutor.execute`

### 3.8 `_handle_ai_message_cancelled(event: Dict[str, Any]) -> None`

- Input type: `dict[str, Any]`
- Output type: `None`
- Purpose: extracts `request_id` and signals cancellation in the in-process registry
- Exceptions: none expected

### 3.9 `_send_to_dlt(record: Any) -> None`

- Input type: Kafka record object
- Output type: `None`
- Purpose: publishes a failed record to a dead-letter topic
- Exceptions:
  - Send failures are caught and only logged

### Topic handling summary

- `file.uploaded.v2`: ingestion pipeline into Qdrant
- `file.deleted.v1`: delete vectors from Qdrant
- `ai.message.requested.v2`: orchestrate retrieval, agents, and streaming
- `ai.message.cancelled.v2`: cancel the active request

## 4. Pipeline orchestration

File: [app/orchestration/pipeline_executor.py](app/orchestration/pipeline_executor.py)

This is the core RAG pipeline controller.

### 4.1 `PipelineExecutor.__init__() -> None`

- Input type: none
- Output type: `None`
- Purpose: constructs retrieval, planning, aggregation, streaming, permission, and metering helpers
- Exceptions: none expected

### 4.2 `execute(payload: Dict[str, Any]) -> None`

- Input type: `dict[str, Any]`
- Output type: `None`
- Purpose: entrypoint for a single AI request from Kafka
- Main steps:
  1. Resolve request identifiers and model metadata
  2. Resolve a user-specific API key if present
  3. Register a cancellation event
  4. Run the pipeline
  5. Publish failed or cancelled events if needed
  6. Remove the cancellation event from the registry
- Exceptions:
  - `RuntimeError` is raised internally if a requested `ai_model_id` is not found, but it is caught by `execute` and converted into a failed stream event
  - `asyncio.CancelledError` is caught and converted into a cancelled stream event
  - Any other exception is caught and converted into a failed stream event
  - In normal operation, no exception propagates to the Kafka consumer

### 4.3 `_resolve_model_info(model_id: str) -> Dict[str, Optional[str] | bool]`

- Input type: `str`
- Output type: `dict[str, Optional[str] | bool]`
- Purpose: fetches model name and provider metadata from the database
- Return shape:
  - `model_name: Optional[str]`
  - `provider: Optional[str]`
  - `found: bool`
- Exceptions:
  - Database or repository errors are caught and converted to `found=False`

### 4.4 `_resolve_user_api_key(user_id: str, model_id: str) -> Optional[str]`

- Input types:
  - `user_id: str`
  - `model_id: str`
- Output type: `Optional[str]`
- Purpose: retrieves and decrypts the active user API key for the model, if one exists
- Exceptions:
  - Repository or decryption errors are caught and converted to `None`

### 4.5 `_run_pipeline(...) -> None`

Parameters and types:

- `request_id: str`
- `chatroom_id: str`
- `user_id: str`
- `model_id: str`
- `model_name: str`
- `provider_name: Optional[str]`
- `question: str`
- `file_ids: list`
- `options: Dict[str, Any]`
- `context_window: list`
- `user_api_key: Optional[str]`
- `cancel_event: asyncio.Event`

Output type: `None`

This function performs the actual request lifecycle:

1. Checks cancellation
2. If files are attached, authorizes file IDs and performs retrieval
3. Reranks chunks
4. Builds the agent execution plan
5. Instantiates agents
6. Runs each agent sequentially
7. Aggregates responses and citations
8. Publishes chunk events to Kafka
9. Publishes the completion event

Exceptions:
- `asyncio.CancelledError` is raised when cancellation is detected and is handled by `execute`
- Any retrieval, planning, agent, or streaming error is handled by `execute` and published as a failed event

### 4.6 `cancel(request_id: str) -> None`

- Input type: `str`
- Output type: `None`
- Purpose: sets the cancellation event for a running request in the current process
- Exceptions: none expected

### 4.7 `_check_cancel(event: asyncio.Event) -> None`

- Input type: `asyncio.Event`
- Output type: `None`
- Purpose: raises `asyncio.CancelledError` if the event has been set
- Exceptions:
  - `asyncio.CancelledError` when cancellation is active

## 5. Authorization and retrieval

### 5.1 File authorization

File: [app/security/user_permission_checker.py](app/security/user_permission_checker.py)

#### `UserPermissionChecker.get_allowed_file_ids(user_id: str, file_ids: List[str]) -> List[str]`

- Input types:
  - `user_id: str`
  - `file_ids: list[str]`
- Output type: `list[str]`
- Purpose: returns only the file IDs the user is allowed to query
- Behavior:
  - If `file_ids` is empty, returns `[]`
  - If authorization fails for any reason, returns `[]` as a fail-safe
- Exceptions:
  - No exception is allowed to escape from this method

#### `UserPermissionChecker._call_grpc(user_id: str, file_ids: List[str]) -> List[str]`

- Input types:
  - `user_id: str`
  - `file_ids: list[str]`
- Output type: `list[str]`
- Purpose: performs the `AuthorizeFilesForUser` gRPC call to `file-service`
- Exceptions:
  - `ImportError` is handled by falling back to allowing all provided file IDs in development
  - gRPC or network errors are propagated to `get_allowed_file_ids`

### 5.2 Query embedding

File: [app/retrieval/query_embedder.py](app/retrieval/query_embedder.py)

#### `QueryEmbedder.embed(query: str) -> List[float]`

- Input type: `str`
- Output type: `list[float]`
- Purpose: calls the TEI embedding endpoint to convert the user question into a vector
- Behavior:
  - On success, returns the first embedding vector from the TEI response
  - On failure, returns a zero vector with length `qdrant_vector_size`
- Exceptions:
  - No exception escapes; all failures are caught and converted to a fallback vector

### 5.3 Vector search

File: [app/retrieval/vector_search.py](app/retrieval/vector_search.py)

#### `VectorSearch.search(query: str, allowed_file_ids: List[str], top_k: int | None = None) -> List[Dict[str, Any]]`

- Input types:
  - `query: str`
  - `allowed_file_ids: list[str]`
  - `top_k: Optional[int]`
- Output type: `list[dict[str, Any]]`
- Purpose: embeds the query, then searches Qdrant for chunks constrained to authorized file IDs
- Behavior:
  - If `allowed_file_ids` is empty, returns `[]`
  - Uses `settings.retrieval_top_k` when `top_k` is not supplied
- Exceptions:
  - Qdrant or embedding errors propagate to the caller

### 5.4 Qdrant client

File: [app/storage/qdrant_client.py](app/storage/qdrant_client.py)

#### `QdrantClient.ensure_collection() -> None`

- Input type: none
- Output type: `None`
- Purpose: creates the target collection if it does not exist
- Exceptions:
  - Internal failures are caught and logged

#### `QdrantClient.ping() -> None`

- Input type: none
- Output type: `None`
- Purpose: health check used by readiness probes
- Exceptions:
  - Underlying client errors propagate to the caller

#### `QdrantClient.search(query_vector: List[float], file_ids: List[str], top_k: int = 20) -> List[Dict[str, Any]]`

- Input types:
  - `query_vector: list[float]`
  - `file_ids: list[str]`
  - `top_k: int`
- Output type: `list[dict[str, Any]]`
- Purpose: searches Qdrant using a file ID filter and returns payload-rich results
- Exceptions:
  - Any search failure is logged and re-raised

#### `QdrantClient.delete_by_file_id(file_id: str) -> None`

- Input type: `str`
- Output type: `None`
- Purpose: removes all vectors for a specific file
- Exceptions:
  - Any delete failure is logged and re-raised

#### `QdrantClient.upsert_chunks(points: List[Dict[str, Any]]) -> None`

- Input type: `list[dict[str, Any]]`
- Output type: `None`
- Purpose: writes chunk vectors and payloads to Qdrant
- Exceptions:
  - Any upsert failure is logged and re-raised

### 5.5 Reranking

File: [app/retrieval/reranker.py](app/retrieval/reranker.py)

#### `Reranker.rerank(query: str, chunks: List[Dict[str, Any]], top_n: int | None = None) -> List[Dict[str, Any]]`

- Input types:
  - `query: str`
  - `chunks: list[dict[str, Any]]`
  - `top_n: Optional[int]`
- Output type: `list[dict[str, Any]]`
- Purpose: reorders retrieved chunks using a cross-encoder when enabled
- Behavior:
  - If reranking is disabled, returns the first `n` chunks in vector order
  - If reranking fails, falls back to the first `n` chunks in vector order
- Exceptions:
  - No exception escapes from this method

#### `Reranker._cross_encode(query: str, chunks: List[Dict[str, Any]], top_n: int) -> List[Dict[str, Any]]`

- Input types:
  - `query: str`
  - `chunks: list[dict[str, Any]]`
  - `top_n: int`
- Output type: `list[dict[str, Any]]`
- Purpose: uses TEI `/rerank` if available, otherwise falls back to a local cross-encoder
- Exceptions:
  - TEI failures are handled internally and converted to local reranking
  - Local reranking import/runtime failures are handled in `_local_rerank`

#### `Reranker._local_rerank(query: str, chunks: List[Dict[str, Any]], top_n: int) -> List[Dict[str, Any]]`

- Input types:
  - `query: str`
  - `chunks: list[dict[str, Any]]`
  - `top_n: int`
- Output type: `list[dict[str, Any]]`
- Purpose: reranks locally using `sentence_transformers.CrossEncoder`
- Exceptions:
  - `ImportError` returns the original top `n` chunks

## 6. Planning and workflow construction

### 6.1 Planner agent

File: [app/orchestration/planner_agent.py](app/orchestration/planner_agent.py)

#### `PlannerAgent.plan(...) -> ExecutionPlan`

Parameters and types:

- `question: str`
- `context_summary: str`
- `model_id: Optional[str]`
- `model_name: Optional[str]`
- `provider_name: Optional[str]`
- `user_api_key: Optional[str]`
- `options: Optional[Dict[str, Any]]`

Output type: `ExecutionPlan`

Purpose:
- Chooses which agents should run for the question
- Uses LLM planning when a model/provider is available
- Falls back to the heuristic plan when LLM planning fails or is unavailable

Exceptions:
- No exception escapes; LLM planning errors are caught and replaced by heuristic planning

#### `PlannerAgent._heuristic_plan(question: str) -> ExecutionPlan`

- Input type: `str`
- Output type: `ExecutionPlan`
- Purpose: keyword-based agent selection
- Exceptions: none expected

#### `PlannerAgent._llm_plan(...) -> ExecutionPlan`

Parameters and types:

- `question: str`
- `context_summary: str`
- `model_id: Optional[str]`
- `model_name: Optional[str]`
- `provider_name: Optional[str]`
- `user_api_key: Optional[str]`
- `options: Dict[str, Any]`

Output type: `ExecutionPlan`

Purpose:
- Sends a planning prompt to the selected LLM provider
- Parses the JSON response and converts it into an execution plan

Exceptions:
- Provider routing errors can propagate from `ProviderRouter.route`
- Provider streaming or JSON parsing failures are caught by `plan` and replaced by heuristic planning

#### `ExecutionPlan`

Fields and types:

- `selected_agents: List[str]`
- `parallel_groups: List[List[str]]`
- `aggregation_format: str`
- `rationale: str`

### 6.2 Workflow builder

File: [app/orchestration/workflow_builder.py](app/orchestration/workflow_builder.py)

#### `WorkflowBuilder.build(plan: ExecutionPlan) -> List[BaseAgent]`

- Input type: `ExecutionPlan`
- Output type: `list[BaseAgent]`
- Purpose: instantiates the selected agent classes in order
- Behavior: unknown agent names are skipped silently
- Exceptions: none expected

#### `WorkflowBuilder.available_agents() -> List[str]`

- Input type: none
- Output type: `list[str]`
- Purpose: returns the registry keys for available agents
- Exceptions: none expected

## 7. Agent execution

### 7.1 Shared agent types

File: [app/agents/base_agent.py](app/agents/base_agent.py)

#### `AgentContext`

Fields and types:

- `request_id: str`
- `user_id: str`
- `question: str`
- `chunks: List[Dict[str, Any]]`
- `model_id: Optional[str]`
- `model_name: Optional[str]`
- `provider_name: Optional[str]`
- `user_api_key: Optional[str]`
- `options: Dict[str, Any]`

#### `AgentResult`

Fields and types:

- `agent_name: str`
- `content: str`
- `citations: List[Dict[str, Any]]`
- `confidence: float`
- `metadata: Dict[str, Any]`

#### `BaseAgent._build_context_text(chunks: List[Dict[str, Any]]) -> str`

- Input type: `list[dict[str, Any]]`
- Output type: `str`
- Purpose: converts retrieval chunks into a prompt-friendly context block
- Exceptions: none expected

#### `BaseAgent._extract_citations(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]`

- Input type: `list[dict[str, Any]]`
- Output type: `list[dict[str, Any]]`
- Purpose: converts chunk payloads into citation metadata
- Exceptions: none expected

### 7.2 Research agent

File: [app/agents/research_agent.py](app/agents/research_agent.py)

#### `ResearchAgent.run(context: AgentContext) -> AgentResult`

- Input type: `AgentContext`
- Output type: `AgentResult`
- Purpose: synthesizes a factual answer from retrieved excerpts
- Behavior:
  - Builds an LLM prompt from the chunks and the user question
  - Routes to a provider with `ProviderRouter`
  - Collects streamed text chunks into a final string
- Exceptions:
  - Provider routing errors can propagate
  - Provider stream errors are usually converted into error chunks by the provider implementation, so the method typically completes with partial or empty content rather than raising

### 7.3 Summarize agent

File: [app/agents/summarize_agent.py](app/agents/summarize_agent.py)

#### `SummarizeAgent.run(context: AgentContext) -> AgentResult`

- Input type: `AgentContext`
- Output type: `AgentResult`
- Purpose: produces a concise summary of the retrieved content
- Exceptions: same behavior as `ResearchAgent.run`

### 7.4 Exam agent

File: [app/agents/exam_agent.py](app/agents/exam_agent.py)

#### `ExamAgent.run(context: AgentContext) -> AgentResult`

- Input type: `AgentContext`
- Output type: `AgentResult`
- Purpose: generates quiz or exam questions from the retrieved content
- Important option:
  - `context.options["num_questions"]` is used when present, defaulting to `5`
- Exceptions: same behavior as `ResearchAgent.run`

### 7.5 Explanation agent

File: [app/agents/explanation_agent.py](app/agents/explanation_agent.py)

#### `ExplanationAgent.run(context: AgentContext) -> AgentResult`

- Input type: `AgentContext`
- Output type: `AgentResult`
- Purpose: explains the requested concept in depth using the retrieved excerpts
- Exceptions: same behavior as `ResearchAgent.run`

### 7.6 Citation agent

File: [app/agents/citation_agent.py](app/agents/citation_agent.py)

#### `CitationAgent.run(context: AgentContext) -> AgentResult`

- Input type: `AgentContext`
- Output type: `AgentResult`
- Purpose: creates a structured citation list from the chunks
- Behavior: this agent does not call an LLM; it formats citations directly
- Exceptions: none expected in normal operation

#### `CitationAgent._build_structured_citations(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]`

- Input type: `list[dict[str, Any]]`
- Output type: `list[dict[str, Any]]`
- Purpose: deduplicates citations by `file_id` and `page_number`
- Exceptions: none expected

### 7.7 Tutor agent

File: [app/agents/tutor_agent.py](app/agents/tutor_agent.py)

#### `TutorAgent.run(context: AgentContext) -> AgentResult`

- Input type: `AgentContext`
- Output type: `AgentResult`
- Purpose: provides Socratic tutoring with conversation history support
- Important option:
  - `context.options["context_window"]` is treated as prior chat history
- Exceptions: same behavior as `ResearchAgent.run`

## 8. Response aggregation and usage accounting

### 8.1 Aggregation

File: [app/orchestration/response_aggregator.py](app/orchestration/response_aggregator.py)

#### `ResponseAggregator.aggregate(results: List[AgentResult], output_format: str = "markdown") -> Dict[str, Any]`

- Input types:
  - `results: list[AgentResult]`
  - `output_format: str`
- Output type: `dict[str, Any]`
- Purpose: merges the content and citations from all agent results
- Behavior:
  - If there are no results, returns empty content and empty citations
  - If there is more than one result, prefixes each section with a heading
  - Deduplicates citations by `(file_id, page_number)`
  - Re-indexes citations starting at `1`
- Exceptions: none expected

Current return shape:

- `content: str`
- `citations: list[dict[str, Any]]`

### 8.2 Token metering

File: [app/usage/token_meter.py](app/usage/token_meter.py)

#### `TokenMeter.estimate(prompt: str, completion: str, model_id: str) -> Dict[str, Any]`

- Input types:
  - `prompt: str`
  - `completion: str`
  - `model_id: str`
- Output type: `dict[str, Any]`
- Purpose: estimates token counts and approximate cost for the request
- Return shape:
  - `prompt_tokens: int`
  - `completion_tokens: int`
  - `total_tokens: int`
  - `cost_estimate: float`
  - `model_id: str`
- Exceptions: none expected

#### `TokenMeter._count_tokens(text: str) -> int`

- Input type: `str`
- Output type: `int`
- Purpose: counts tokens using `tiktoken` when available, otherwise uses a rough character heuristic
- Exceptions: none expected

#### `TokenMeter._estimate_cost(prompt_tokens: int, completion_tokens: int, model_id: str) -> float`

- Input types:
  - `prompt_tokens: int`
  - `completion_tokens: int`
  - `model_id: str`
- Output type: `float`
- Purpose: estimates USD cost using a provider-specific rate table
- Exceptions: none expected

## 9. Streaming back to Kafka

File: [app/streaming/response_streamer.py](app/streaming/response_streamer.py)

The stream publisher converts the final pipeline result into Kafka events for the rest of the system.

### 9.1 `ResponseStreamer.__init__() -> None`

- Input type: none
- Output type: `None`
- Purpose: grabs the shared Kafka producer singleton
- Exceptions: none expected

### 9.2 `publish_chunk(...) -> None`

Parameters and types:

- `chatroom_id: str`
- `message_id: str`
- `request_id: str`
- `sequence: int`
- `content_delta: str`
- `citations: List[Dict[str, Any]]`
- `done: bool`

Output type: `None`

Purpose:
- Publishes `ai.message.chunk.v2` events to Kafka
- Each call carries one text delta and, on the first chunk, the citations array

Exceptions:
- No exception is expected to escape; the underlying producer logs send failures

### 9.3 `publish_completed(...) -> None`

Parameters and types:

- `chatroom_id: str`
- `message_id: str`
- `request_id: str`
- `final_content: str`
- `citations: List[Dict[str, Any]]`
- `usage: Dict[str, Any]`
- `model_used: str`

Output type: `None`

Purpose:
- Publishes `ai.message.completed.v2` with the final answer, citations, and usage metrics

Exceptions:
- No exception is expected to escape

### 9.4 `publish_failed(...) -> None`

Parameters and types:

- `chatroom_id: str`
- `message_id: str`
- `request_id: str`
- `error: str`

Output type: `None`

Purpose:
- Publishes `ai.message.failed.v2` when the pipeline fails

Exceptions:
- No exception is expected to escape

### 9.5 `publish_cancelled(...) -> None`

Parameters and types:

- `chatroom_id: str`
- `message_id: str`
- `request_id: str`

Output type: `None`

Purpose:
- Publishes `ai.message.cancelled.v2` when the request is cancelled

Exceptions:
- No exception is expected to escape

### 9.6 `_now() -> str`

- Input type: none
- Output type: `str`
- Purpose: generates the event timestamp in UTC ISO-8601 format
- Exceptions: none expected

### 9.7 `KafkaProducer.start() -> None`

- Input type: none
- Output type: `None`
- Purpose: creates the underlying Kafka producer client
- Exceptions:
  - Import or connection failures are caught and logged

### 9.8 `KafkaProducer.stop() -> None`

- Input type: none
- Output type: `None`
- Purpose: flushes and closes the producer
- Exceptions: stop failures are swallowed

### 9.9 `KafkaProducer.send(topic: str, key: str, value: Any) -> None`

- Input types:
  - `topic: str`
  - `key: str`
  - `value: Any`
- Output type: `None`
- Purpose: sends the Kafka message if the producer exists
- Behavior:
  - If the producer is unavailable, the send is skipped
- Exceptions:
  - Send failures are caught and logged

### 9.10 `get_producer() -> KafkaProducer`

- Input type: none
- Output type: `KafkaProducer`
- Purpose: returns a cached producer singleton
- Exceptions: none expected

## 10. Provider routing and LLM providers

### 10.1 Provider router

File: [app/llm/provider_router.py](app/llm/provider_router.py)

#### `ProviderRouter.route(model_id: Optional[str], user_api_key: Optional[str] = None, preferred_provider: Optional[str] = None, allow_fallback: bool = True) -> BaseLLMProvider`

- Input types:
  - `model_id: Optional[str]`
  - `user_api_key: Optional[str]`
  - `preferred_provider: Optional[str]`
  - `allow_fallback: bool`
- Output type: `BaseLLMProvider`
- Purpose: selects the concrete provider implementation
- Failure behavior:
  - Raises `RuntimeError` when the requested provider is unsupported or unavailable and fallback is disabled
  - Raises `RuntimeError` when no provider is configured at all

#### `ProviderRouter.available_providers() -> List[str]`

- Input type: none
- Output type: `list[str]`
- Purpose: lists the providers that are currently available
- Exceptions: none expected

### 10.2 Base provider types

File: [app/llm/base_provider.py](app/llm/base_provider.py)

#### `LLMMessage`

- `role: str`
- `content: str`

#### `LLMRequest`

- `messages: List[LLMMessage]`
- `model: Optional[str]`
- `max_tokens: int`
- `temperature: float`
- `stream: bool`
- `user_api_key: Optional[str]`

#### `LLMChunk`

- `delta: str`
- `done: bool`
- `finish_reason: Optional[str]`

#### `LLMUsage`

- `prompt_tokens: int`
- `completion_tokens: int`
- `total_tokens: int`
- `cost_estimate: float`

#### `BaseLLMProvider.stream(request: LLMRequest) -> AsyncIterator[LLMChunk]`

- Input type: `LLMRequest`
- Output type: async iterator of `LLMChunk`
- Purpose: yields the model output in chunks
- Exceptions: provider implementations handle most failures internally and usually yield a final error chunk instead of raising

### 10.3 Concrete providers

Files:

- [app/llm/openai_provider.py](app/llm/openai_provider.py)
- [app/llm/gemini_provider.py](app/llm/gemini_provider.py)
- [app/llm/deepseek_provider.py](app/llm/deepseek_provider.py)
- [app/llm/groq_provider.py](app/llm/groq_provider.py)
- [app/llm/local_provider.py](app/llm/local_provider.py)
- [app/llm/openrouter_provider.py](app/llm/openrouter_provider.py)

Common contract for each provider:

- `provider_name -> str`
- `default_model -> str`
- `is_available() -> bool`
- `stream(request: LLMRequest) -> AsyncIterator[LLMChunk]`
- `get_usage() -> LLMUsage`

Shared behavior:

- `is_available` checks whether the provider-specific key or URL exists in settings
- `stream` accepts `request.user_api_key` first, then falls back to the configured platform key or local endpoint
- On runtime failure, each provider logs the error and yields a terminal `LLMChunk` with `done=True` and `finish_reason="error"`

## 11. Database and key storage helpers used by the flow

### 11.1 Session setup

File: [app/db/session.py](app/db/session.py)

#### `get_db_session() -> AsyncIterator[AsyncSession]`

- Input type: none
- Output type: async iterator of `AsyncSession`
- Purpose: dependency-style database session factory
- Exceptions: none expected

#### `init_database() -> None`

- Input type: none
- Output type: `None`
- Purpose: creates missing tables and seeds default models and platform keys
- Exceptions:
  - Schema and seed failures are propagated to the startup caller, where they are logged and ignored by `lifespan`

### 11.2 Repositories

File: [app/repositories/ai_model_repository.py](app/repositories/ai_model_repository.py)

#### `AIModelRepository.get_by_id(model_id: str) -> AIModel | None`

- Input type: `str`
- Output type: `AIModel | None`
- Purpose: fetches model metadata by primary key
- Exceptions: database access errors propagate

#### `AIModelRepository.list_active_with_user_key_flag(user_id: str) -> list[dict[str, object]]`

- Input type: `str`
- Output type: `list[dict[str, object]]`
- Purpose: returns active models plus whether the user has a configured key
- Exceptions: database access errors propagate

File: [app/repositories/user_key_repository.py](app/repositories/user_key_repository.py)

#### `UserKeyRepository.get_active_key(user_id: str, model_id: str) -> UserAiApiKey | None`

- Input types:
  - `user_id: str`
  - `model_id: str`
- Output type: `UserAiApiKey | None`
- Purpose: returns the active encrypted key for the user and model
- Exceptions: database access errors propagate

#### `UserKeyRepository.upsert(user_id: str, model_id: str, encrypted_api_key: str) -> UserAiApiKey`

- Input types:
  - `user_id: str`
  - `model_id: str`
  - `encrypted_api_key: str`
- Output type: `UserAiApiKey`
- Purpose: creates or updates the stored user key
- Exceptions: database access errors propagate

#### `UserKeyRepository.delete(user_id: str, model_id: str) -> bool`

- Input types:
  - `user_id: str`
  - `model_id: str`
- Output type: `bool`
- Purpose: deletes the active key if one exists
- Exceptions: database access errors propagate

### 11.3 Key encryption

File: [app/security/encryption.py](app/security/encryption.py)

#### `encrypt_key(api_key: str) -> str`

- Input type: `str`
- Output type: `str`
- Purpose: encrypts a provider API key before storing it
- Exceptions:
  - `ValueError` when `api_key` is empty

#### `decrypt_key(encrypted_key: str) -> str`

- Input type: `str`
- Output type: `str`
- Purpose: decrypts a stored provider API key
- Exceptions:
  - `ValueError` when `encrypted_key` is empty
  - Decryption failures from the cryptography backend can propagate

## 12. End-to-end flow summary

1. `chat-service` stores the user message and publishes `ai.message.requested.v2` to Kafka.
2. `IngestionConsumer._consume_loop` polls the topic and dispatches the record.
3. `_handle_ai_message_requested` creates `PipelineExecutor` and calls `execute`.
4. `PipelineExecutor.execute` resolves model metadata and user API key, registers cancellation, and starts `_run_pipeline`.
5. `_run_pipeline` authorizes files, embeds the question, searches Qdrant, reranks chunks, plans the workflow, runs agents, aggregates output, and publishes chunk events.
6. `ResponseStreamer.publish_chunk` emits `ai.message.chunk.v2` events for progressive streaming.
7. `TokenMeter.estimate` calculates usage and cost.
8. `ResponseStreamer.publish_completed` emits the final `ai.message.completed.v2` event.
9. If anything fails, `PipelineExecutor.execute` publishes `ai.message.failed.v2`.
10. If a cancellation event arrives, `PipelineExecutor.cancel` sets the cancellation flag and the next `_check_cancel` raises `asyncio.CancelledError`, which becomes `ai.message.cancelled.v2`.

## 13. Practical notes

- Retrieval is optional. If `file_ids` is empty, the pipeline skips vector search and still continues with the planner and agents.
- The current implementation streams Kafka events, not SSE directly. The API gateway or chat layer is responsible for consuming those events and forwarding them to the client.
- Most provider and retrieval failures are converted into fallback behavior instead of hard crashes.
- Cancellation is in-process. If the request is running in a different worker process, `PipelineExecutor.cancel` only affects the worker that holds the registry entry.

## 14. Files that define the behavior described above

- [app/main.py](app/main.py)
- [app/ingestion/kafka_consumer.py](app/ingestion/kafka_consumer.py)
- [app/orchestration/pipeline_executor.py](app/orchestration/pipeline_executor.py)
- [app/orchestration/planner_agent.py](app/orchestration/planner_agent.py)
- [app/orchestration/workflow_builder.py](app/orchestration/workflow_builder.py)
- [app/orchestration/response_aggregator.py](app/orchestration/response_aggregator.py)
- [app/retrieval/query_embedder.py](app/retrieval/query_embedder.py)
- [app/retrieval/vector_search.py](app/retrieval/vector_search.py)
- [app/retrieval/reranker.py](app/retrieval/reranker.py)
- [app/security/user_permission_checker.py](app/security/user_permission_checker.py)
- [app/streaming/response_streamer.py](app/streaming/response_streamer.py)
- [app/usage/token_meter.py](app/usage/token_meter.py)
- [app/llm/provider_router.py](app/llm/provider_router.py)
- [app/agents/base_agent.py](app/agents/base_agent.py)
- [app/agents/research_agent.py](app/agents/research_agent.py)
- [app/agents/summarize_agent.py](app/agents/summarize_agent.py)
- [app/agents/exam_agent.py](app/agents/exam_agent.py)
- [app/agents/explanation_agent.py](app/agents/explanation_agent.py)
- [app/agents/citation_agent.py](app/agents/citation_agent.py)
- [app/agents/tutor_agent.py](app/agents/tutor_agent.py)
- [app/storage/qdrant_client.py](app/storage/qdrant_client.py)
- [app/db/session.py](app/db/session.py)
- [app/repositories/ai_model_repository.py](app/repositories/ai_model_repository.py)
- [app/repositories/user_key_repository.py](app/repositories/user_key_repository.py)
- [app/security/encryption.py](app/security/encryption.py)