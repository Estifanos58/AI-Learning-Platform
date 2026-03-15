# GET_AI.md

## Objective

Implement support for **retrieving available AI models and managing user-provided API keys** for those models within the AI Learning Platform.

The implementation requires changes primarily in:

* **RAG Service (FastAPI)** → source of AI model data and API key management.
* **API Gateway (Spring Boot)** → exposes GET endpoint to clients and forwards requests to the RAG Service.
* **Database (PostgreSQL)** → store supported AI models and user API keys.

The goal is to allow:

1. The platform to maintain a list of supported AI models.
2. Users to optionally attach their own API key to a model.
3. The system to return a list of AI models accessible to the user (with metadata).
4. Secure storage of user API keys (encrypted).

---

# System Context

The platform backend consists of multiple microservices:

* API Gateway (Spring Boot)
* Auth Service (Spring Boot)
* User Profile Service (Spring Boot)
* File Service (Spring Boot)
* RAG Service (FastAPI)

Communication patterns:

* Client → API Gateway → gRPC → services
* Event driven communication via Kafka
* PostgreSQL databases per service
* Docker based infrastructure

The **RAG Service** already orchestrates AI models and embeddings.
This task extends it to support **model registry + user API keys**.

---

# Functional Requirements

## 1 Supported AI Models Registry

The platform supports multiple AI models from different providers:

Examples:

* OpenAI
* Gemini
* DeepSeek
* Local models

These models must be stored in a database table.

Each record represents a **model supported by the platform**.

Metadata includes:

* model name
* provider
* context length
* description
* whether the platform provides a default API key
* status (active / deprecated)

---

## 2 User API Keys

Users may optionally provide their own API keys.

If present:

* The system uses the **user key**
* Otherwise the **platform key (env variable)** is used

User API keys must be:

* **encrypted before storage**
* associated with both **user_id and model_id**

---

# Database Design

The database belongs to the **RAG Service**.

## Table: ai_models

Stores AI models supported by the platform.

Fields:

| column                 | type      | description                        |
| ---------------------- | --------- | ---------------------------------- |
| id                     | UUID (PK) | unique model identifier            |
| model_name             | VARCHAR   | model name                         |
| provider               | VARCHAR   | openai / gemini / deepseek / local |
| description            | TEXT      | model description                  |
| context_length         | INTEGER   | maximum context window             |
| supports_streaming     | BOOLEAN   | streaming support                  |
| platform_key_available | BOOLEAN   | platform default API key exists    |
| active                 | BOOLEAN   | whether model is usable            |
| created_at             | TIMESTAMP | record creation time               |
| updated_at             | TIMESTAMP | last update                        |

Example rows:

```
gpt-4o
gpt-4o-mini
gemini-1.5-pro
deepseek-chat
local-llama
```

---

## Table: user_ai_api_keys

Stores encrypted user API keys.

Fields:

| column            | type                     | description |
| ----------------- | ------------------------ | ----------- |
| id                | UUID (PK)                |             |
| user_id           | UUID                     |             |
| model_id          | UUID (FK → ai_models.id) |             |
| encrypted_api_key | TEXT                     |             |
| created_at        | TIMESTAMP                |             |
| updated_at        | TIMESTAMP                |             |
| is_active         | BOOLEAN                  |             |

Constraints:

```
UNIQUE(user_id, model_id)
```

A user may only have **one API key per model**.

---

# Encryption Requirement

User API keys must be encrypted before storage.

Use:

```
Fernet encryption
```

Implementation steps:

1. Create `security/encryption.py`
2. Load encryption key from environment:

```
AI_KEY_ENCRYPTION_SECRET
```

3. Provide helper methods:

```
encrypt_key(api_key)
decrypt_key(encrypted_key)
```

Never return decrypted keys in API responses.

---

# RAG Service Implementation (FastAPI)

Create a new module:

```
rag_service/api/ai_models_controller.py
```

---

## Endpoint 1

### List Available AI Models

Returns all AI models available to the user.

This includes metadata plus whether the user has configured a key.

Route:

```
GET /ai/models
```

Response example:

```
[
  {
    "model_id": "uuid",
    "model_name": "gpt-4o",
    "provider": "openai",
    "context_length": 128000,
    "supports_streaming": true,
    "user_key_configured": true
  }
]
```

Implementation steps:

1. Extract `user_id` from request context.
2. Query `ai_models` where `active = true`.
3. Join with `user_ai_api_keys`.
4. Add computed field `user_key_configured`.

---

## Endpoint 2

### Add API Key

```
POST /ai/api-keys
```

Payload:

```
{
  "model_id": "uuid",
  "api_key": "user-api-key"
}
```

Steps:

1. Validate model exists.
2. Encrypt API key.
3. Insert into `user_ai_api_keys`.

---

## Endpoint 3

### Update API Key

```
PUT /ai/api-keys/{model_id}
```

Steps:

1. Encrypt new key.
2. Update existing record.

---

## Endpoint 4

### Delete API Key

```
DELETE /ai/api-keys/{model_id}
```

Steps:

1. Delete record for user + model.

---

# API Gateway Changes (Spring Boot)

The API Gateway must expose a **GET endpoint** for clients.

Create:

```
GET /api/ai/models
```

Flow:

```
Client
   │
API Gateway
   │
gRPC
   │
RAG Service
```

Steps:

1. Add new controller

```
AiModelController
```

2. Inject gRPC client for RAG service.

3. Forward request to RAG service.

4. Return response to client.

---

# gRPC Contract

Create protobuf:

```
ai_models.proto
```

Services:

```
service AiModelService {

  rpc ListModels(ListModelsRequest)
      returns (ListModelsResponse);

  rpc CreateUserApiKey(CreateUserApiKeyRequest)
      returns (ApiKeyResponse);

  rpc UpdateUserApiKey(UpdateUserApiKeyRequest)
      returns (ApiKeyResponse);

  rpc DeleteUserApiKey(DeleteUserApiKeyRequest)
      returns (ApiKeyResponse);
}
```

---

# Security Considerations

1. API keys must be encrypted.
2. API keys must **never appear in logs**.
3. API keys must **never be returned in API responses**.
4. Validate user identity using the JWT forwarded by the API Gateway.

---

# Integration With Existing LLM Router

Modify:

```
llm/provider_router.py
```

New behavior:

```
if user_api_key exists:
    use decrypted key
else:
    use platform key from env
```

Environment variables:

```
OPENAI_API_KEY
GEMINI_API_KEY
DEEPSEEK_API_KEY
```

---

# Expected Directory Additions

```
rag_service/

api/
   ai_models_controller.py

models/
   ai_model.py
   user_ai_api_key.py

repositories/
   ai_model_repository.py
   user_key_repository.py

security/
   encryption.py

grpc/
   ai_models.proto
```

---

# Testing Requirements

Add unit tests for:

1. API key encryption
2. API key CRUD operations
3. Listing AI models
4. Platform key fallback logic

---

# Acceptance Criteria

Implementation is complete when:

* AI models can be stored in database.
* Users can store encrypted API keys.
* API Gateway exposes `/api/ai/models`.
* RAG service returns available models.
* Platform keys are used if user keys are absent.
* Keys are encrypted and never exposed.

---

# End of File
