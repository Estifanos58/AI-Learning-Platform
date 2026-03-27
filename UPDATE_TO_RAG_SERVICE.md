# CHANGE_TO_RAG.md

## Objective

Refactor the current `rag-service` AI model management and execution pipeline to support:

* Dynamic model creation via API (no startup seeding)
* Multi-provider support per model
* Multiple API keys (accounts) per provider
* Free-tier quota-aware execution
* Automatic API key rotation on rate limits
* Scalable model orchestration layer

---

# 1. REMOVE EXISTING MODEL SEEDING SYSTEM

## Files to Modify

* `app/db/session.py`
* `app/db/seed_platform_keys.py`

## Actions

### 1.1 Remove Model Seeding

Delete or disable:

* `seed_default_ai_models()`
* Any logic that inserts models at startup

### 1.2 Remove Platform Key Sync

Delete:

* `sync_platform_keys()`

### 1.3 Keep Schema Initialization Only

Retain:

* `init_database()`
* table creation logic

---

# 2. INTRODUCE NEW DATABASE SCHEMA

Replace the current `ai_models`-centric design with the following structure.

---

## 2.1 ModelDefinition Table

**File:** `app/models/model_definition.py`

```python
id: UUID (PK)
model_name: string (unique)
family: string
context_length: int
capabilities: JSON
active: bool
created_at
updated_at
```

---

## 2.2 ModelProvider Table

**File:** `app/models/model_provider.py`

```python
id: UUID (PK)
model_definition_id: FK → ModelDefinition
provider_name: string
provider_model_name: string
priority: int
active: bool
created_at
```

---

## 2.3 ProviderAccount Table

**File:** `app/models/provider_account.py`

```python
id: UUID (PK)
provider_name: string
account_label: string
encrypted_api_key: string

rate_limit_per_minute: int
daily_quota: int
used_today: int

last_used_at: datetime
last_reset_at: datetime

is_active: bool
health_status: string  # healthy, throttled, disabled
created_at
```

---

## 2.4 ModelEndpoint Table

**File:** `app/models/model_endpoint.py`

```python
id: UUID (PK)
model_provider_id: FK → ModelProvider
provider_account_id: FK → ProviderAccount

weight: float
active: bool
last_used_at: datetime
health_status: string
created_at
```

---

# 3. REMOVE OLD MODEL USAGE LOGIC

## Files to Modify

* `app/orchestration/pipeline_executor.py`
* `app/llm/provider_router.py`

## Actions

### 3.1 Remove Dependency on:

* `ai_models` table
* `platform_key_available`
* `encrypted_platform_key`

### 3.2 Remove ProviderRouter Logic

Delete:

* keyword-based routing
* static fallback order

---

# 4. ADD NEW CORE COMPONENTS

---

## 4.1 ModelOrchestrator

**File:** `app/llm/model_orchestrator.py`

### Responsibilities:

* Resolve `model_definition`
* Fetch all related `model_providers`
* Fetch all `model_endpoints`
* Call `EndpointSelector`

---

## 4.2 EndpointSelector

**File:** `app/llm/endpoint_selector.py`

### Responsibilities:

* Filter endpoints:

  * inactive
  * quota exceeded
  * rate-limited
  * unhealthy

* Score endpoints:

```python
score =
    weight * 0.4 +
    remaining_quota_ratio * 0.3 +
    recency_penalty * 0.2 +
    health_score * 0.1
```

* Return best endpoint

---

## 4.3 AccountPoolManager

**File:** `app/llm/account_pool_manager.py`

### Responsibilities:

* Track usage per account
* Check:

  * rate limits
  * daily quota
* Update usage after each request

---

## 4.4 ProviderExecutor

**File:** `app/llm/provider_executor.py`

### Responsibilities:

* Execute actual LLM call
* Accept:

```python
provider_name
provider_model_name
api_key
```

* Handle errors:

  * 429 → mark account throttled
  * 401 → deactivate account
  * timeout → reduce health

---

# 5. MODIFY PIPELINE EXECUTION

## File: `app/orchestration/pipeline_executor.py`

---

## 5.1 Replace Model Resolution

### OLD

```python
_resolve_model_info()
_resolve_user_api_key()
```

### NEW

```python
endpoint = ModelOrchestrator.select_endpoint(model_id)
```

---

## 5.2 Update Agent Context

Replace:

```python
model_name
provider_name
user_api_key
```

With:

```python
provider_name
provider_model_name
api_key
endpoint_id
```

---

## 5.3 Execution Flow Update

Each agent:

```python
response = ProviderExecutor.execute(
    provider=endpoint.provider_name,
    model=endpoint.provider_model_name,
    api_key=endpoint.api_key,
    prompt=...
)
```

---

## 5.4 Retry Logic

On failure:

```python
try next endpoint
```

Max retries: configurable (default 3)

---

# 6. ADD gRPC APIs FOR MODEL MANAGEMENT

## File: `app/grpc/ai_models_server.py`

---

## 6.1 CreateModelDefinition

Create new logical model

---

## 6.2 AttachProviderToModel

Map provider to model

---

## 6.3 CreateProviderAccount

* Accept API key
* Encrypt before storing

---

## 6.4 List APIs

* list models
* list providers
* list accounts

---

## 6.5 Remove Old APIs

Delete:

* `CreateUserApiKey`
* `UpdateUserApiKey`
* `DeleteUserApiKey`

---

# 7. REMOVE USER API KEY SYSTEM

## Files

* `app/models/user_ai_api_key.py`
* related repositories

## Action

Delete completely.

---

# 8. ADD QUOTA + RATE LIMIT MANAGEMENT

---

## 8.1 Usage Update

After each request:

```python
account.used_today += tokens_used
account.last_used_at = now()
```

---

## 8.2 Rate Limit Tracking

Track:

* requests per minute
* tokens per minute

---

## 8.3 Quota Reset Worker

**File:** `app/workers/quota_reset_worker.py`

Run periodically:

```python
if now - last_reset_at >= 24h:
    used_today = 0
```

---

# 9. HEALTH MANAGEMENT

---

## On Errors:

| Error   | Action              |
| ------- | ------------------- |
| 429     | mark throttled      |
| 401     | deactivate          |
| timeout | reduce health score |

---

# 10. BACKWARD COMPATIBILITY

---

## Phase 1

* Keep `ai_models` table
* Do not use it

---

## Phase 2

* Remove it completely

---

# 11. CONFIGURATION CHANGES

Remove:

* OPENAI_MODEL
* GEMINI_MODEL
* any default model config

Replace with:

* dynamic DB-driven models

---

# 12. TESTING REQUIREMENTS

Ensure:

* multiple API keys rotate correctly
* rate limit triggers fallback
* quota exhaustion triggers fallback
* system works with:

  * 1 provider
  * multiple providers
  * multiple accounts

---

# FINAL RESULT

After implementation, the system must:

* allow runtime creation of models
* support multiple providers per model
* support multiple API keys per provider
* automatically rotate keys on limits
* eliminate static seeding
* dynamically select best execution endpoint

---

END OF FILE
