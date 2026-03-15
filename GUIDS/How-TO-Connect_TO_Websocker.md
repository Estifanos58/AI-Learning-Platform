# How To Connect To Gateway Chat WebSocket (Frontend)

This gateway exposes:
- **WebSocket** for real-time chat events
- **HTTP REST** endpoints for creating/sending data (messages, typing, listing chatrooms/messages)

Use both together:
1. Open WebSocket to receive live updates.
2. Call `/api/chat/**` endpoints to send actions.

---

## 1) WebSocket endpoint

### URL

- Local: `ws://localhost:8081/ws/chat`
- Production: `wss://<your-gateway-host>/ws/chat`

### Query params

- `token` (required): JWT access token (raw JWT string, or `Bearer <token>` also accepted)
- `chatroomId` (optional): if present, gateway verifies user is a member of this chatroom and then streams room events

### Behavior

- If `chatroomId` is **not** provided: you receive only `newChatroom` events for the authenticated user.
- If `chatroomId` **is** provided: you receive room events (`newMessage`, `typing`, AI events) + `newChatroom`.
- If token is invalid or user is not allowed in the room, socket is closed by server.

---

## 2) Frontend connection example (JavaScript)

```js
const gatewayHttpBase = "http://localhost:8081";
const gatewayWsBase = "ws://localhost:8081";

function openChatSocket({ accessToken, chatroomId }) {
  const params = new URLSearchParams({ token: accessToken });
  if (chatroomId) params.set("chatroomId", chatroomId);

  const socket = new WebSocket(`${gatewayWsBase}/ws/chat?${params.toString()}`);

  socket.onopen = () => {
    console.log("WS connected");
  };

  socket.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    handleRealtimeEvent(payload);
  };

  socket.onclose = (event) => {
    console.log("WS closed", event.code, event.reason);
  };

  socket.onerror = (err) => {
    console.error("WS error", err);
  };

  return socket;
}

function handleRealtimeEvent(evt) {
  switch (evt.type) {
    case "newMessage":
      // evt.chatroomId, evt.data
      break;
    case "typing":
      // evt.chatroomId, evt.data = { userId, chatroomId, isTyping }
      break;
    case "newChatroom":
      // evt.userId, evt.data
      break;
    case "AI_CHUNK":
    case "AI_COMPLETED":
    case "AI_FAILED":
    case "AI_CANCELLED":
      // evt.chatroomId, evt.data
      break;
    default:
      console.warn("Unknown event", evt);
  }
}
```

---

## 3) Event payload shapes

All messages are JSON envelopes with `type`.

### `newMessage`

```json
{
  "type": "newMessage",
  "chatroomId": "<chatroom-uuid>",
  "data": {
    "message": {
      "id": "<message-uuid>",
      "chatroomId": "<chatroom-uuid>",
      "senderUserId": "<user-uuid>",
      "aiModelId": "",
      "content": "hello",
      "fileId": "",
      "createdAt": "2026-..."
    },
    "chatroomId": "<chatroom-uuid>",
    "userId": "<sender-user-uuid>",
    "fileId": ""
  }
}
```

### `typing`

```json
{
  "type": "typing",
  "chatroomId": "<chatroom-uuid>",
  "data": {
    "userId": "<user-uuid>",
    "chatroomId": "<chatroom-uuid>",
    "isTyping": true
  }
}
```

### `newChatroom`

```json
{
  "type": "newChatroom",
  "userId": "<current-user-uuid>",
  "data": {
    "message": { "...": "..." },
    "chatroomId": "<chatroom-uuid>",
    "otherUserId": "<other-user-uuid>",
    "userId": "<sender-user-uuid>",
    "fileId": ""
  }
}
```

### AI events (`AI_CHUNK`, `AI_COMPLETED`, `AI_FAILED`, `AI_CANCELLED`)

```json
{
  "type": "AI_CHUNK",
  "chatroomId": "<chatroom-uuid>",
  "data": {
    "type": "AI_CHUNK",
    "chatroomId": "<chatroom-uuid>",
    "messageId": "<message-uuid>",
    "sequence": 1,
    "contentDelta": "partial text",
    "done": false
  }
}
```

---

## 4) REST endpoints to call from frontend (through gateway)

Always send header:
- `Authorization: Bearer <accessToken>`
- optional: `X-Correlation-ID: <uuid>`

### Send message (person-to-person or AI)

`POST /api/chat/messages`

Body fields:
- `otherUserId` (for creating 1:1 chat)
- `chatroomId` (for existing room)
- `content`
- `aiModelId` (if AI request)
- optional file fields: `fileId`, `fileOriginalName`, `fileContentType`, `fileBase64`

Example:

```json
{
  "chatroomId": "<chatroom-uuid>",
  "content": "Explain recursion",
  "aiModelId": "gpt-4o-mini"
}
```

### List chatrooms

`GET /api/chat/chatrooms?page=0&size=20`

### Get one chatroom

`GET /api/chat/chatrooms/{chatroomId}`

### List messages in chatroom

`GET /api/chat/chatrooms/{chatroomId}/messages?page=0&size=20`

### Typing indicator

`POST /api/chat/chatrooms/{chatroomId}/typing?isTyping=true`

### Cancel AI generation

`POST /api/chat/messages/{messageId}/cancel`

---

## 5) Recommended realtime flow

1. User logs in and gets `accessToken`.
2. Open socket without room to listen for `newChatroom`:
   - `/ws/chat?token=<jwt>`
3. When user opens a room, open (or switch to) room socket:
   - `/ws/chat?token=<jwt>&chatroomId=<roomId>`
4. Send message via `POST /api/chat/messages`.
5. Update UI from socket events (`newMessage`, `typing`, AI events).
6. On reconnect, re-open socket and refresh room history with `GET /api/chat/chatrooms/{id}/messages`.

---

## 6) Notes

- WebSocket is event-driven; use REST for mutations (send/cancel/typing/list).
- Keep token secure; use HTTPS/WSS in production.
- If server closes socket immediately, verify token validity and room membership.
