# UPDATE_UI.md

## Purpose

Update the frontend to match the recent backend changes in `api-gateway` and `rag-service`.

The main changes are:

- direct AI execution is now a first-class route
- AI model management is now dynamic and DB-driven
- the chat composer send action should route to direct AI execution
- the left sidebar "Create New Chat" action should open a new chat tab in the main area
- file context should be draggable into the new chat tab workflow

This document is written for the frontend developer AI and should be treated as the implementation contract.

---

## 1. Current Backend Surface That UI Must Use

### 1.1 AI execution route

Use this route when the user clicks Send in the new AI chat experience:

- `POST /api/internal/ai/executions`

Purpose:

- start a direct AI execution request
- return an accepted response immediately

Request body shape:

```json
{
  "requestId": "optional-client-id",
  "prompt": "required text",
  "mode": "chat or deep",
  "aiModelId": "optional model id",
  "fileIds": ["optional file ids"],
  "chatroomId": "optional chatroom id",
  "messageId": "optional message id",
  "options": {
    "temperature": "0.2",
    "max_tokens": "2048"
  }
}
```

Response shape:

```json
{
  "status": "accepted",
  "requestId": "...",
  "streamKey": "stream:chat:{chatroomId} or stream:ai:{requestId}",
  "accepted": true
}
```

### 1.2 Model management routes

Use these for model management UI screens and dropdown data:

- `GET /api/internal/ai/models`
- `POST /api/internal/ai/models`
- `POST /api/internal/ai/providers`
- `POST /api/internal/ai/accounts`
- `GET /api/internal/ai/providers?modelId=...`
- `GET /api/internal/ai/accounts?providerName=...`

### 1.3 Existing chat route still exists

The existing chat route still exists and should not be removed from the app shell:

- `POST /api/internal/chat/messages`

However, the new AI composer flow should use the direct AI execution route above when the user clicks Send in the new AI tab experience.

---

## 2. UI Behavior Changes Required

### 2.1 Left sidebar: Create New Chat

Current behavior should be removed.

New behavior:

- clicking Create New Chat opens a new chat tab in the main area
- if a file is already open, the new chat tab opens side by side with the file viewer
- if no file is open, the main area becomes a full chat workspace like Gemini or ChatGPT
- the new chat tab should not navigate away from the workspace shell
- the current file browser remains available so files can be dragged into the chat tab

### 2.2 Send button behavior

Current behavior should be changed.

New behavior:

- clicking Send in the new chat tab routes to Direct AI Mode
- the UI must call `POST /api/internal/ai/executions`
- the composer should include the selected model, attached file ids, current context, and execution mode
- the UI should show an accepted/pending state immediately after submission

### 2.3 File drag and drop

The chat workspace should support dragging files from the file list into the new chat tab.

Expected behavior:

- dragging a file into the chat tab adds it as an attachment/context file
- attachments should be visible in the composer or a dedicated attachment strip
- attached files must be included in the `fileIds` array sent to the execution endpoint

### 2.4 Layout behavior

The main area should behave as follows:

- if a file is open, preserve the file viewer and show the chat tab next to it
- if no file is open, render the chat workspace as the full main content
- support multiple tabs in the main area if the user opens multiple chat sessions

---

## 3. Routes and Screen Updates

### 3.1 Routes to support in the frontend

Implement or update these frontend routes/screens:

- `/app/workspace`
- `/app/workspace/[folderId]`
- `/app/workspace/[folderId]/[fileId]`
- a new chat tab workspace view inside the main panel

You do not need to change the backend chat/file routes for the workspace shell, but the UI should now treat AI chat as a tabbed execution surface rather than only a right-side assistant panel.

### 3.2 New AI workspace tab states

The new chat tab should support these states:

- empty state before a prompt is entered
- draft state with attachments and model selected
- submitting state after Send is clicked
- accepted state after `POST /api/internal/ai/executions`
- streaming state while the execution output arrives
- error state when execution fails

---

## 4. Data Flow Changes

### 4.1 Model loading

The model selector must no longer rely on hardcoded OpenAI/Gemini defaults.

Instead:

- load models from `GET /api/internal/ai/models`
- use the returned model definitions and provider counts to populate the selector
- allow the user to pick from the available dynamic models

### 4.2 Provider/account management screens

If the UI has model/admin screens, update them to support:

- creating a model definition
- attaching a provider to a model
- creating a provider account with an API key
- listing providers for a model
- listing accounts for a provider

If these admin screens do not exist yet, add them as lightweight scaffolded screens only if the frontend scope requires them.

### 4.3 Execution submission payload

When the user sends a prompt, submit:

- `prompt`: the message text
- `mode`: `deep` by default unless the UI explicitly supports `chat`
- `aiModelId`: selected model id
- `fileIds`: attached file ids from the workspace
- `chatroomId`: if the current chat tab belongs to an existing chatroom
- `messageId`: if the UI already created a message shell for the tab
- `options`: model/config preferences such as temperature and max tokens

---

## 5. Streaming and Response Handling

### 5.1 Accepted response

The send action should immediately resolve to an accepted state using the response from `POST /api/internal/ai/executions`.

The UI should store:

- `requestId`
- `streamKey`
- `accepted`

### 5.2 Stream consumption

The backend now exposes stream keys in the response, so the UI should be prepared to subscribe to the execution stream by `requestId` or `streamKey`.

If the current frontend already has SSE/WebSocket plumbing:

- adapt it to handle direct AI execution events
- keep chat and direct execution streams separated

If the current frontend has no direct execution stream client yet:

- implement a dedicated stream client for AI execution updates
- do not reuse a chat-only stream model without checking the stream key

### 5.3 Response states

The UI should handle these terminal states:

- completed
- failed
- cancelled

The UI should also handle progressive chunk updates during execution.

---

## 6. Component Changes

### 6.1 Main workspace

Update the main workspace shell so it can host:

- file viewer pane
- new AI chat tab pane
- side-by-side split layout when a file and chat are both active

### 6.2 Chat composer

Update the composer so it supports:

- prompt input
- dynamic model selector
- attached files list
- send action to direct AI execution
- execution loading state

### 6.3 File list and drag targets

Update file list items so they can be dragged into the AI chat tab.

### 6.4 Empty states

The empty state copy should guide the user to:

- create a new chat tab
- select a model
- attach files if needed
- send a prompt to start direct AI execution

---

## 7. Authentication and Headers

All requests to the new AI execution and model management routes must continue to include:

- `Authorization: Bearer <token>`
- `X-Correlation-ID` when available

Keep the current gateway auth flow intact.

---

## 8. Suggested Frontend State Model

Use a workspace state model that can track:

- active file id
- active folder id
- active chat tab id
- attached file ids for the active chat tab
- selected AI model id
- current request id
- current stream key
- execution status

Recommended tab status values:

- `idle`
- `draft`
- `submitting`
- `accepted`
- `streaming`
- `completed`
- `failed`
- `cancelled`

---

## 9. Implementation Checklist

1. Replace the current Send handler to call `POST /api/internal/ai/executions`.
2. Add a new AI workspace tab model in the main panel.
3. Change Create New Chat to open a new chat tab instead of the old behavior.
4. Allow split view when a file is open and a chat tab is active.
5. Add drag-and-drop from file list to chat tab attachments.
6. Load models dynamically from `GET /api/internal/ai/models`.
7. Add model/provider/account management screens if the frontend scope includes admin tools.
8. Update stream handling to use the accepted response stream key and separate direct AI execution from chat UI concerns.

---

## 10. Notes For The Frontend Developer AI

- Do not hardcode model names in the UI.
- Do not assume the old AI request flow is still correct for Send.
- Treat direct AI execution as the default action for the new chat tab.
- Preserve the existing file viewer and workspace shell behavior.
- Keep the UI modular so the chat workspace can evolve independently from the file viewer.
