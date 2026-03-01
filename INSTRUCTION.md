# INSTRUCTION.md

## Chat Service – AI Learning Platform

---

# Objective

Create a production-ready **Chat Service** responsible for:

* Managing direct messages (DM) and group chatrooms
* Managing chatroom memberships
* Persisting messages
* Supporting AI model participation inside chatrooms
* Publishing chat-related events
* Providing typing indicators
* Enabling real-time messaging
* Exposing operations via gRPC
* Using Redis for real-time pub/sub and caching
* Publishing AI-triggered messages to Kafka for future RAG processing

This service must integrate with:

* **api-gateway** (gRPC only)
* **auth-service** (JWT validated at gateway)
* **user-profile-service** (no direct DB coupling, only userId references)
* **Kafka** (for AI-related message events)
* **Redis** (for pub/sub and typing indicators)
* Future **rag-service** (consumes AI message events)

---

# 1. Project Metadata

Project Name: `chat-service`
Build Tool: Maven
Language: Java 21
Framework: Spring Boot 3.x

Communication:

* gRPC (Server)
* Redis (Pub/Sub + caching)
* Kafka (Producer)
* Database: PostgreSQL **or** MongoDB

  * Prefer PostgreSQL for consistency with other services

---

# 2. Architectural Role

The Chat Service:

* Owns chatroom lifecycle
* Owns membership lifecycle
* Owns message persistence
* Does NOT authenticate users
* Trusts identity forwarded by API Gateway
* Publishes AI-related messages to Kafka
* Uses Redis for real-time communication
* Supports soft delete strategy
* Supports typing indicators

---

# 3. High-Level Behavior

## 3.1 Direct Message Flow

When user A sends message to user B:

1. Extract `userId` from gRPC metadata.
2. Look for existing non-group chatroom containing both users.
3. If not found:

   * Create new chatroom
   * Insert memberships
   * Publish Redis event: `chatroom.created`
4. Persist message in DB.
5. Publish Redis event: `message.sent`
6. If message references AI model:

   * Publish Kafka event: `chat.message.ai_requested.v1`

---

## 3.2 Group Chat Flow

* Created explicitly via gRPC
* Multiple members allowed
* AI models can be added as members
* Role-based membership supported

---

# 4. Database Design

You MUST keep the schema structure EXACTLY as defined below.
It is derived from a previous production-grade social media system.

We will adapt it to JPA entities (PostgreSQL).

---

## 4.1 Chatroom

```
CREATE TABLE chatrooms (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    is_group BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_by_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_chatroom_created_by ON chatrooms(created_by_id);
CREATE INDEX idx_chatroom_created_at ON chatrooms(created_at);
```

---

## 4.2 ChatroomUser (Membership)

```
CREATE TABLE chatroom_users (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    chatroom_id UUID NOT NULL,
    role VARCHAR(20) DEFAULT 'MEMBER',
    joined_at TIMESTAMP NOT NULL,
    last_read_at TIMESTAMP NULL,
    is_muted BOOLEAN DEFAULT FALSE,

    UNIQUE(user_id, chatroom_id)
);

CREATE INDEX idx_chatroom_user ON chatroom_users(chatroom_id, user_id);
```

Roles Enum:

```
MEMBER
ADMIN
AI_MODEL
```

AI models will also be inserted as "members" with role `AI_MODEL`.

---

## 4.3 Message

```
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    content TEXT,
    image_url TEXT,
    user_id UUID NOT NULL,
    chatroom_id UUID NOT NULL,
    ai_model_id UUID NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_messages_room_time
ON messages(chatroom_id, created_at, user_id, deleted_at);
```

### Important:

* `ai_model_id` must be nullable.
* Only present when message is directed to AI.
* Used to trigger Kafka event.

---

## 4.4 AI Models Table (Expandable Design)

We must NOT hardcode models.

```
CREATE TABLE ai_models (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL
);
```

This allows:

* Adding models dynamically
* Future RAG service mapping
* No hardcoded AI logic

---

# 5. Domain Model (JPA)

Create:

* ChatroomEntity
* ChatroomUserEntity
* MessageEntity
* AiModelEntity

Use:

* UUID
* @Enumerated(EnumType.STRING) for role
* Soft delete using deletedAt

---

# 6. gRPC Definition (chat.proto)

Service Name: `ChatService`

### Required RPCs

CreateOrGetDirectChat(CreateDirectChatRequest) returns (ChatroomResponse)

CreateGroupChat(CreateGroupChatRequest) returns (ChatroomResponse)

SendMessage(SendMessageRequest) returns (MessageResponse)

ListMessages(ListMessagesRequest) returns (ListMessagesResponse)

AddMember(AddMemberRequest) returns (SimpleResponse)

RemoveMember(RemoveMemberRequest) returns (SimpleResponse)

MarkAsRead(MarkAsReadRequest) returns (SimpleResponse)

GetMyChatrooms(GetMyChatroomsRequest) returns (ListChatroomsResponse)

AddAiModelToChat(AddAiModelRequest) returns (SimpleResponse)

TypingEvent(TypingRequest) returns (SimpleResponse)

---

# 7. Redis Integration

Redis is used for:

* Pub/Sub messaging
* Typing indicators
* Chatroom creation notifications
* Real-time message broadcasting
* Optional caching of last messages

### Channels

```
chatroom.created.{chatroomId}
chat.message.{chatroomId}
chat.typing.{chatroomId}
```

### Typing Event

When user is typing:

* Publish event:

```
{
  chatroomId,
  userId,
  typing: true,
  timestamp
}
```

Do NOT persist typing events.

---

# 8. Kafka Integration

Kafka is used ONLY for AI-triggered messages.

Topic:

```
chat.message.ai_requested.v1
```

Event Example:

```
{
  "eventId": "uuid",
  "messageId": "uuid",
  "chatroomId": "uuid",
  "userId": "uuid",
  "aiModelId": "uuid",
  "content": "Explain this PDF",
  "timestamp": "2026-03-01T10:00:00"
}
```

Future RAG service will consume this.

---

# 9. Security Model

JWT validated at API Gateway.

Gateway forwards:

* userId
* roles
* universityId

Rules:

* Only members can send messages
* Only members can view messages
* Only ADMIN can remove members
* AI_MODEL role cannot send manual messages
* Soft delete only allowed by sender

---

# 10. Business Rules

## SendMessage

* Validate membership
* Persist message
* If aiModelId != null:

  * Validate AI model exists and active
  * Publish Kafka event
* Publish Redis message event

## CreateDirectChat

* Must contain exactly 2 human users
* If exists → return existing
* Else create and publish Redis event

## Soft Delete

* Set deleted_at
* Do NOT physically remove row

---

# 11. Docker Configuration

```
chat-service:
  build: ./chat-service
  ports:
    - "9094:9094"
  depends_on:
    - postgres
    - redis
    - kafka
```

Database:

`chat_service_db`

Redis container required.

Do NOT expose DB externally.

---

# 12. application.yml

```
server:
  port: 9094

spring:
  datasource:
    url: jdbc:postgresql://postgres:5432/chat_service_db
    username: postgres
    password: postgres

  jpa:
    hibernate:
      ddl-auto: update

redis:
  host: redis
  port: 6379

kafka:
  bootstrap-servers: kafka:9092
```

---

# 13. Observability

* Structured logging
* Log messageId and chatroomId
* Include correlationId from metadata
* Expose Actuator health endpoint
* Log Redis publish failures
* Log Kafka publish failures

---

# 14. Performance Considerations

* Index chatroom_id + created_at
* Use pagination for messages
* Avoid N+1 membership queries
* Consider caching last 50 messages in Redis

---

# 15. Definition of Done

✔ Direct chats auto-created
✔ Group chats supported
✔ AI models dynamically stored
✔ AI-triggered messages published to Kafka
✔ Redis real-time pub/sub working
✔ Typing indicators working
✔ Soft delete implemented
✔ gRPC integrated with API Gateway
✔ Service containerized
✔ Membership rules enforced
✔ Pagination implemented

---

# 16. Future Enhancements

* WebSocket gateway integration
* Message reactions
* Message attachments (via file-service)
* Read receipts counters
* Push notifications
* Message encryption (E2E)
* Sharding large chatrooms
* Event sourcing

---

# Final Architecture Overview

Services:

* auth-service
* user-profile-service
* file-service
* rag-service (future)
* chat-service

Chat Service becomes:

Single Source of Truth for chatrooms, memberships, and messages.

AI orchestration is event-driven via Kafka.

Redis handles real-time experience.

Other services:
Never store chat messages.
Only communicate via gRPC.
