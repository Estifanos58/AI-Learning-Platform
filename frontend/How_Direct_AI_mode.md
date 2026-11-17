# How Direct AI Mode works (frontend -> gateway -> backend)

This document explains how the Direct AI mode is implemented on the frontend, what HTTP / streaming endpoints it calls on the gateway, the payloads and streaming envelope shapes it expects, and the fallback/polling behavior. Use this as a reference for debugging why the frontend is not receiving AI responses.

## High-level flow

- User types a prompt in the Direct AI UI (`src/features/workspace/chat/direct-ai-chat.tsx`).
- Frontend calls the gateway to create an AI execution via `gatewayApi.chat.startAiExecution(...)` (POST `ai/executions`).
- On success the frontend receives a `requestId` (execution id) and optionally `chatroomId` and `messageId`.
- Frontend opens an SSE stream to the execution stream endpoint: `GET /ai/executions/{requestId}/stream` (via `gatewayApi.chat.streamAiExecution(...)`).
- The stream produces events (replays, incremental chunks, final/completed, failed, cancelled). The frontend applies these into the UI via callbacks: `onReplay`, `onChunk`, `onCompleted`, `onFailed`, `onCancelled`.
- If the SSE disconnects repeatedly, the frontend retries with exponential backoff, then falls back to polling the execution state using `GET /ai/executions/{executionId}` (via `gatewayApi.chat.getAiExecution(...)`).

## Frontend code points

- Component: [src/features/workspace/chat/direct-ai-chat.tsx](src/features/workspace/chat/direct-ai-chat.tsx)
  - Starts execution with: `gatewayApi.chat.startAiExecution(session.accessToken, { prompt, mode: 'chat', aiModelId, fileIds, chatroomId })`.
  - After receiving the `requestId`, it calls `gatewayApi.chat.streamAiExecution({ token, requestId, ... callbacks })` to stream the execution.
  - Streaming logic lives in `connectExecutionStream(...)` and handles retries with exponential backoff, and a polling fallback `startExecutionPollingFallback(...)` when streaming repeatedly fails.
  - Cancellation calls: `gatewayApi.chat.cancelAiExecution(session.accessToken, executionId)`.

- Gateway wrapper: [src/lib/api/gateway.ts](src/lib/api/gateway.ts) and [src/lib/api/gateway-chat.ts](src/lib/api/gateway-chat.ts)
  - `startAiExecution(...)` -> POST `ai/executions` (body contains `prompt`, `mode`, `aiModelId`, `fileIds`, `chatroomId`, etc.).
  - `streamAiExecution(...)` -> SSE `GET /ai/executions/{requestId}/stream` using `fetchEventSource`.
  - `getAiExecution(...)` -> GET `ai/executions/{executionId}` used by the polling fallback.

## Gateway / HTTP layer details

- HTTP requests are performed by `apiRequest(...)` which ultimately calls `executeRequest(...)` in `src/lib/api/core/http.ts`.
  - `executeRequest` sets headers including `Accept: application/json`, `X-Correlation-ID`, conditional `Content-Type: application/json`, and `Authorization: Bearer <token>` when `token` is provided.
  - Keep an eye on `X-Correlation-ID` when tracing logs: frontend includes it on every request.

## Start execution (request/response contract)

- Endpoint: POST `${API_BASE_URL}/ai/executions`
- Called by: `gatewayApi.chat.startAiExecution(token, input)`
- Expected request body (example):

```json
{
  "prompt": "Summarize the document...",
  "mode": "chat",
  "aiModelId": "model-123",
  "fileIds": ["file-1","file-2"],
  "chatroomId": "chat-abc",
  "options": { }
}
```

- Successful response (what frontend expects):

```json
{
  "status": "accepted",
  "requestId": "exec-xxxxx",    // mapped to Execution.executionId
  "streamKey": "...",           // optional
  "accepted": true,
  "chatroomId": "chat-abc",     // optional - used to resolve message/chatroom mapping
  "messageId": "msg-yyy"        // optional - message id for the assistant message
}
```

Notes:
- The frontend uses `requestId` to open the execution stream. If the backend returns a `chatroomId` and `messageId`, those are used to reconcile the temporary local assistant message with the persistent entity from the server.

## Execution streaming (SSE) endpoint

- Endpoint: GET `${API_BASE_URL}/ai/executions/{requestId}/stream`
- Called by: `gatewayApi.chat.streamAiExecution(...)`
- Transport: server-sent events (SSE) / text/event-stream handled by `@microsoft/fetch-event-source`.

- Expected event envelope (gateway-side parsing accepts multiple shapes). Common envelope fields the frontend relies on:
  - `event_type` or `type` (string): e.g. `ai_replay`, `chunk`, `stage`, `final`, `error`, `cancelled`, or upper-case variants like `AI_CHUNK`, `AI_COMPLETED`.
  - `request_id` (string) or `requestId` — execution id
  - `payload` or `data` object containing:
    - `message_id` / `messageId` — optional assistant message id
    - `content` — full replayed content (used by `ai_replay`)
    - `content_delta` / `contentDelta` — incremental text chunks
    - `final_content` / `finalContent` — final text for completed event
    - `sanitization_flags` / `sanitizationFlags` — optional array of strings
    - `error_message` / `error` — error string
    - `done` — boolean
    - `sequence` — optional chunk sequence number

- Event types handled by `gatewayApi.chat.streamAiExecution` (frontend-side):
  - `ai_replay` / `AI_REPLAY`: replay of already-generated content (frontend sets content and status STREAMING)
  - `chunk` / `AI_CHUNK`: incremental chunk; frontend appends `content_delta` to the assistant message
  - `stage`: optional progress stages from backend (ignored by UI except for debug)
  - `final` / `AI_COMPLETED`: terminal successful event — frontend sets finalContent, status COMPLETED
  - `error` / `AI_FAILED`: terminal failure event — frontend marks FAILED and appends the error
  - `cancelled` / `AI_CANCELLED`: terminal cancelled event — frontend marks CANCELLED

Important: the frontend expects a terminal event (final/error/cancelled). If the SSE never emits a terminal event, the client will keep the assistant message in STREAMING state; repeated disconnects trigger retry logic (see below).

## Retry and fallback behavior (frontend)

- Streaming retry policy (see `direct-ai-chat.tsx`):
  - Max retries: 5 (STREAM_MAX_RETRIES)
  - Exponential backoff: base 1000ms, doubled each retry, capped at 10000ms
  - If the stream disconnects before a terminal event, the frontend will retry the SSE up to the max attempts.

- Polling fallback:
  - After exhausting retries the frontend will call `GET /ai/executions/{executionId}` periodically (every 3000ms) until the execution reaches a terminal state.
  - Backend response to `getAiExecution` is expected to contain `status`, `messageId`, `chatroomId`, `content` and/or `finalContent`, or `error` if failed.

## Message-level streaming (chat messages)

- There is also a `chat/messages/{messageId}/stream` endpoint (`gatewayApi.chat.streamAiResponse`) used elsewhere for streaming directly against a message resource. Its envelope uses similar event types: `AI_CHUNK`, `AI_COMPLETED`, `AI_FAILED`, `AI_CANCELLED`.

## Where the frontend maps stream to UI

- `onReplay`: sets assistant message content to `content` and status STREAMING.
- `onChunk`: appends `contentDelta` to the assistant message content and keeps status STREAMING.
- `onCompleted`: sets assistant message content to `finalContent` and status COMPLETED, clears execution tracking and refreshes chat history.
- `onFailed`: appends the error, marks FAILED, clears execution tracking and refreshes history.
- `onCancelled`: marks CANCELLED and clears execution tracking.

Sanitization flags (if present) get propagated into the local `LocalMessage.sanitizationFlags` array and are surfaced in the UI.

## Cancel flow

- Frontend calls `gatewayApi.chat.cancelAiExecution(token, executionId)` which sends `DELETE /ai/executions/{executionId}`. The frontend also cancels any active SSE / polling locally.

## Common debugging checklist for backend devs

If the backend receives the execution request and processes it to RAG-service but the frontend never receives streaming updates, check the following:

- SSE endpoint path and authorization
  - Confirm the server is exposing `GET /ai/executions/{requestId}/stream` and it accepts the same bearer token as the POST.
  - Verify CORS and that `Content-Type: text/event-stream` is set and connections are kept open.
  - Check the request's `X-Correlation-ID` header to trace logs across services.

- Envelope shape and event types
  - Ensure events are JSON-encoded and include either `event_type` or `type` and a payload under `payload` or `data`.
  - Provide `request_id` (or `requestId`) and preferably `message_id` (`messageId`) so the frontend can map stream updates to messages.
  - Emit terminal events (`AI_COMPLETED`/`AI_FAILED`/`AI_CANCELLED`) when finished. Without them the client will keep waiting and eventually switch to polling.

- Keep connection alive and flush properly
  - For SSE use chunked transfer encoding; flush after sending each event so the client receives chunks in real-time.

- Fail / retry behavior
  - If an SSE disconnects, the frontend will retry with backoff. Verify server logs for disconnects and reasons (timeouts, errors, connection resets).

- Polling fallback
  - Ensure `GET /ai/executions/{executionId}` returns up-to-date `status` and `finalContent`/`content`/`error` so the client poll fallback can finish the message.

- Message/chatroom ids
  - If the backend writes a persisted message to a chatroom, return `chatroomId` and `messageId` in the `startAiExecution` response so the frontend can reconcile the temporary message id with the persisted message.

## Example SSE event payloads

- Incremental chunk:

```json
{
  "event_type": "AI_CHUNK",
  "request_id": "exec-xxxxx",
  "payload": {
    "message_id": "msg-yyy",
    "content_delta": "Hello",
    "sequence": 1
  }
}
```

- Final completed event:

```json
{
  "event_type": "AI_COMPLETED",
  "request_id": "exec-xxxxx",
  "payload": {
    "message_id": "msg-yyy",
    "final_content": "Hello world",
    "sanitization_flags": []
  }
}
```

- Error event:

```json
{
  "event_type": "AI_FAILED",
  "request_id": "exec-xxxxx",
  "payload": {
    "message_id": "msg-yyy",
    "error_message": "Provider returned an error"
  }
}
```

## Where to look in the frontend code

- `connectExecutionStream` in `src/features/workspace/chat/direct-ai-chat.tsx` — streaming callbacks and retry logic.
- `startExecutionPollingFallback` in same file — polling `gatewayApi.chat.getAiExecution(...)`.
- `gatewayApi.chat.streamAiExecution` in `src/lib/api/gateway-chat.ts` — SSE parsing rules and event type mapping for execution streams.

## Quick recommendations

- Ensure SSE endpoint sends events with `event_type`/`type` and `payload` as JSON.
- Ensure terminal events are emitted.
- Return `chatroomId` & `messageId` from POST /ai/executions when available.
- Inspect server logs for the connection lifecycle (open, chunk writes, final write, close) and correlate using `X-Correlation-ID`.

---

If you'd like, I can:

- Add a short sequence diagram (mermaid) illustrating the flow.
- Create a compact troubleshooting checklist file for backend logs to copy into the RAG-service team.

/end
