# AI-CHAT_Instruction.md

## Frontend Client Migration Guide: Chat Mode vs Direct AI Mode

This document explains the current implementation for the two AI interaction patterns and what frontend clients must change.

## 1. What You Had Before (from previous guides)

Previous client instructions (mainly [GUIDS/GET_AI.md](GUIDS/GET_AI.md)) were centered on this flow:

1. `GET /api/internal/ai/models`
2. `POST /api/internal/chat/messages` with `aiModelId` + `content`
3. Stream from `GET /api/internal/chat/messages/{messageId}/stream?chatroomId={chatroomId}`
4. Optional cancel: `POST /api/internal/chat/messages/{messageId}/cancel`

This still works for AI inside chatrooms (Chat Mode), but there is now a separate Direct AI execution path.

## 2. What Changed

There are now two distinct interaction modes:

1. Chat Mode (chatroom-centric)
2. Direct AI Mode (execution-centric)

### Chat Mode

Use chat endpoints exactly as before for in-chat AI replies.

### Direct AI Mode

Use a new endpoint:

- `POST /api/ai/executions` (gateway public route)
- Internal mapped route is `POST /api/internal/ai/executions`

Important mode mapping behavior:

- `mode = "chat"` maps to chat execution mode in RAG
- `mode = "deep"` maps to deep execution mode in RAG
- If `mode` is missing/blank, backend defaults to `deep`
- Any mode value other than `chat` is treated as `deep`

## 3. Authentication and Headers

All AI/chat endpoints require:

- `Authorization: Bearer <access_token>`
- `Content-Type: application/json` (for POST/PUT)

Recommended:

- `X-Correlation-ID: <uuid>`

## 4. Endpoint Contracts (Current)

## 4.1 Model List (unchanged)

- Public: `GET /api/ai/models`
- Internal: `GET /api/internal/ai/models`

Success: `200` with array of model objects.

## 4.2 Chat Mode Send Message

- Public: `POST /api/chat/messages`
- Internal: `POST /api/internal/chat/messages`

Request body shape:

```json
{
  "otherUserId": "optional-uuid-for-dm",
  "chatroomId": "optional-existing-chatroom-uuid",
  "aiModelId": "optional-uuid-when-requesting-ai-reply",
  "content": "message text",
  "fileId": "optional-existing-file-uuid",
  "fileBase64": "optional-inline-file-base64",
  "fileOriginalName": "optional-file-name",
  "fileContentType": "optional-mime-type"
}
```

Validation/business rules enforced by backend:

- Must provide one of: `otherUserId`, `chatroomId`, or `aiModelId`
- Cannot create a DM with yourself
- Must provide at least one of: `content`, `fileId`, or inline file (`fileBase64`)

Success response: `200`

```json
{
  "message": {
    "id": "uuid",
    "chatroomId": "uuid",
    "senderUserId": "uuid",
    "aiModelId": "uuid-or-empty",
    "content": "text",
    "fileId": "uuid-or-empty",
    "createdAt": "timestamp"
  },
  "chatroomId": "uuid",
  "isNewChatroom": true
}
```

Notes:

- If `aiModelId` is provided, backend triggers RAG generation asynchronously.
- This endpoint is prompt-sanitized at gateway level (defensive normalization and audit flags).

## 4.3 Chat Mode Stream Response (SSE)

- Public: `GET /api/chat/messages/{messageId}/stream?chatroomId={chatroomId}`
- Internal: `GET /api/internal/chat/messages/{messageId}/stream?chatroomId={chatroomId}`

SSE event name:

- `event: ai_chunk`

SSE `data` JSON envelope currently sent by gateway:

```json
{
  "type": "AI_CHUNK | AI_COMPLETED | AI_FAILED | AI_CANCELLED",
  "data": {
    "type": "AI_CHUNK | AI_COMPLETED | AI_FAILED | AI_CANCELLED",
    "chatroomId": "uuid",
    "messageId": "uuid",
    "sequence": 0,
    "contentDelta": "partial text",
    "finalContent": "final text",
    "error": "failure reason",
    "done": false
  }
}
```

Field presence by type:

- `AI_CHUNK`: `sequence`, `contentDelta`, `done`
- `AI_COMPLETED`: `finalContent`
- `AI_FAILED`: `error`
- `AI_CANCELLED`: cancellation marker

## 4.4 Chat Mode Cancel

- Public: `POST /api/chat/messages/{messageId}/cancel`
- Internal: `POST /api/internal/chat/messages/{messageId}/cancel`

Success: `200`

```json
{
  "message": "Cancellation requested"
}
```

## 4.5 Direct AI Mode Start Execution (new)

- Public: `POST /api/ai/executions`
- Internal: `POST /api/internal/ai/executions`

Request body shape:

```json
{
  "requestId": "optional-client-id",
  "prompt": "required-non-empty",
  "mode": "chat or deep",
  "aiModelId": "optional-model-uuid",
  "fileIds": ["optional-file-uuid"],
  "chatroomId": "optional-chatroom-uuid",
  "messageId": "optional-message-uuid",
  "options": {
    "temperature": "0.2",
    "max_tokens": "2048"
  }
}
```

Backend behavior:

- `prompt` is required
- if `requestId` is missing, server generates one
- returns accepted immediately (async execution)

Success response: `202 Accepted`

```json
{
  "status": "accepted",
  "requestId": "id-used-by-backend",
  "streamKey": "stream:chat:{chatroomId} or stream:ai:{requestId}",
  "accepted": true
}
```

## 5. Error Contract (all these endpoints)

Error response shape (same standard contract):

```json
{
  "timestamp": "ISO-8601",
  "status": 400,
  "error": "Bad Request",
  "code": "VALIDATION_FAILED",
  "message": "Request validation failed",
  "path": "/api/chat/messages",
  "correlationId": "uuid",
  "details": {}
}
```

Common status/code patterns you should handle:

- `400`: `VALIDATION_FAILED`, `MALFORMED_REQUEST`, `BAD_REQUEST`
- `401`: `UNAUTHORIZED`
- `403`: `FORBIDDEN`
- `404`: `NOT_FOUND`
- `409`: `CONFLICT`
- `429`: `RATE_LIMITED`
- `502`: `UPSTREAM_ERROR`
- `503`: `SERVICE_UNAVAILABLE`
- `504`: `UPSTREAM_TIMEOUT`
- `500`: `INTERNAL_ERROR`

Client recommendation:

- Use `status` + `code` for logic
- Show `message` directly for 4xx
- For 5xx, show generic UI message and log `correlationId`

## 6. Required Frontend Changes

## 6.1 Split the UX flow by mode

Before:

- AI generation always started with `POST /chat/messages`.

Now:

- Chat Mode UI: keep using `POST /chat/messages` and chat SSE stream.
- Direct AI UI: call `POST /ai/executions`.

## 6.2 Keep Chat Mode streaming logic

No major change in SSE event types for chat mode:

- `AI_CHUNK`
- `AI_COMPLETED`
- `AI_FAILED`
- `AI_CANCELLED`

You should still append deltas and finalize on completion.

## 6.3 Direct mode streaming: current implementation status

Current codebase state:

- Direct execution start exists (`POST /api/ai/executions`).
- Gateway does not currently expose a dedicated direct SSE endpoint like `GET /api/ai/executions/{requestId}/stream`.
- Existing SSE endpoint is chat-message based (`/api/chat/messages/{messageId}/stream`) and is wired to chatroom Redis Pub/Sub channels.

Practical implication for client right now:

- Do not assume direct mode has an HTTP SSE stream endpoint yet.
- Treat `POST /api/ai/executions` as asynchronous acceptance and use product-level fallback UX (pending state, refresh/manual retrieval path) until a dedicated direct stream/read endpoint is published.
- If realtime token streaming is mandatory in current release, use Chat Mode flow.

## 7. How Streaming Currently Works End-to-End (RAG -> Client)

Chat Mode streaming pipeline:

1. Client sends chat message with `aiModelId`.
2. Chat service persists message and triggers RAG execution.
3. RAG pipeline publishes v2 events:
   - `ai.message.chunk.v2`
   - `ai.message.completed.v2`
   - `ai.message.failed.v2`
   - `ai.message.cancelled.v2`
4. Chat service consumes these Kafka events and republishes to Redis Pub/Sub channels:
   - `aiChunk.{chatroomId}`
   - `aiCompleted.{chatroomId}`
   - `aiFailed.{chatroomId}`
   - `aiCancelled.{chatroomId}`
5. API gateway subscribes to those Redis channels and emits SSE events to the frontend as `event: ai_chunk` with envelope type `AI_*`.

RAG also supports Redis Streams sink internally (`stream:chat:{chatroomId}` / `stream:ai:{requestId}`), but current gateway chat SSE path is wired to Redis Pub/Sub bridge from chat-service.

## 8. Migration Checklist for Frontend Team

1. Keep existing Chat Mode integration from [GUIDS/GET_AI.md](GUIDS/GET_AI.md) for in-chat AI.
2. Add Direct AI start call: `POST /api/ai/executions`.
3. Update frontend architecture so mode selection determines endpoint path.
4. Reuse standardized error contract handling from [GUIDS/RESPONSE_SCENARIOS.md](GUIDS/RESPONSE_SCENARIOS.md).
5. Do not wire Direct AI mode to chat SSE endpoint unless backend publishes a dedicated direct stream contract.
6. Continue sending `X-Correlation-ID` and logging returned `correlationId` on errors.

## 9. Minimal TypeScript Models

```ts
export type SendChatMessageRequest = {
  otherUserId?: string;
  chatroomId?: string;
  aiModelId?: string;
  content?: string;
  fileId?: string;
  fileBase64?: string;
  fileOriginalName?: string;
  fileContentType?: string;
};

export type StartAiExecutionRequest = {
  requestId?: string;
  prompt: string;
  mode?: "chat" | "deep" | string;
  aiModelId?: string;
  fileIds?: string[];
  chatroomId?: string;
  messageId?: string;
  options?: Record<string, string>;
};

export type StartAiExecutionResponse = {
  status: string;
  requestId: string;
  streamKey: string;
  accepted: boolean;
};

export type AiStreamEnvelope = {
  type: "AI_CHUNK" | "AI_COMPLETED" | "AI_FAILED" | "AI_CANCELLED";
  data: {
    type?: "AI_CHUNK" | "AI_COMPLETED" | "AI_FAILED" | "AI_CANCELLED";
    messageId: string;
    sequence?: number;
    contentDelta?: string;
    finalContent?: string;
    error?: string;
    done?: boolean;
  };
};
```
" based on the above instruction apply change to requests sent to ai chat and reponse hadling if change sexists from the current implementation and what is discribed here and also when create New Chat Button is clicked in the left side bar remove the current behaviour and add a new reature here is what will happen when user clicks it we will create a new tab in the main bar if file is opened create the tab side by side to it else no file open the whole main bar will be chat bar which will be newly created like the web interface of gemini or chat ui and the user can drag and drop file from the files list use the current implementation and also when the user clicks send this will route to Direct AI mode