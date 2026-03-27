# Instruction.md — AI Refactor Planning for Unified AI Execution Architecture

## 🎯 Objective

You are tasked with analyzing the existing codebases of the following services:

* **API Gateway (Spring Boot)**
* **Chat Service (Spring Boot)**
* **RAG Service (FastAPI + Python)**

Your goal is to:

> **Produce a comprehensive, implementation-ready plan (in Markdown format)** describing how to refactor and extend the system to support a unified AI execution architecture with real-time streaming via Redis and gRPC-based execution.

---

## 🧠 Context Summary (Target Architecture)

The system is evolving into a **dual-mode AI execution platform**:

### 1. Chat Mode (Conversational AI)

```
Client → API Gateway → Chat Service → gRPC → RAG Service
                                               ↓
                                           Redis Stream
                                               ↓
                                             Client
                                               ↓
                              Final Response → Chat Service (DB)
```

### 2. Direct AI Mode (Task-Oriented)

```
Client → API Gateway → RAG Service
                                 ↓
                        Multi-stage execution
                                 ↓
                           Redis Stream
                                 ↓
                              Client
                                 ↓
                        Final Save → RAG DB
```

---

## 🚨 Key Architectural Changes to Implement

### 1. Remove Kafka Chunk Streaming

* Eliminate Kafka usage for:

  * `ai.message.chunk.v2`
  * real-time response streaming
* Kafka is no longer in the real-time execution path

---

### 2. Introduce Redis Streams for Real-Time Communication

* Use Redis Streams (NOT Pub/Sub)

#### Stream Naming:

* Chat mode:

  ```
  stream:chat:{chatroom_id}
  ```
* Direct AI mode:

  ```
  stream:ai:{request_id}
  ```

#### Event Types:

* `chunk`
* `final`
* `stage` (for direct AI mode)

---

### 3. Treat AI as a First-Class Chat Participant

* AI messages must follow the same schema as user messages
* Streaming chunks should map to a single `message_id`

---

### 4. Introduce gRPC Communication

#### Chat → RAG:

* Replace Kafka event publishing with **gRPC streaming**

#### API Gateway → RAG:

* Direct route for task-based AI execution

---

### 5. Introduce Execution Modes in RAG Service

Add support for:

```
mode = "chat" | "deep"
```

* `chat`: lightweight execution
* `deep`: full RAG pipeline (existing behavior)

---

### 6. Introduce Stream Abstraction in RAG Service

Replace Kafka-based streaming with:

```
StreamSink (interface)
  ├── RedisStreamSink (new)
```

---

### 7. Persistence Strategy

#### Chat Mode:

* Chat-service owns all message persistence (including AI)

#### Direct Mode:

* RAG-service persists results in its own DB

---

## 📋 Your Task

You must:

### 1. Analyze Each Codebase

#### API Gateway

* Routing configuration
* Existing endpoints
* Authentication flow
* Service-to-service communication

#### Chat Service

* Message persistence logic
* Kafka publisher usage
* Chatroom/message schema
* WebSocket/Redis usage (if any)

#### RAG Service

* Kafka consumer logic
* `PipelineExecutor`
* Streaming (`ResponseStreamer`)
* Agent execution flow
* API endpoints (if any)

---

### 2. Identify Required Changes

For each service, determine:

* What must be **removed**
* What must be **modified**
* What must be **added**

---

### 3. Produce a Structured Implementation Plan

Your output MUST be in Markdown and include:

---

## 🧩 Required Plan Structure

### 1. Overview

* Summary of current architecture (based on code)
* Summary of target architecture

---

### 2. API Gateway Changes

* New routes to add
* Existing routes to modify
* Routing logic (chat vs direct AI)
* Request/response contract changes

---

### 3. Chat Service Changes

* Remove Kafka publishing logic
* Add gRPC client for RAG-service
* Modify message lifecycle:

  * message creation
  * streaming handling
  * final persistence
* Redis integration (if not present)
* Schema updates (if needed)

---

### 4. RAG Service Changes

#### 4.1 Execution Layer

* Modify `PipelineExecutor`
* Add execution modes (`chat`, `deep`)
* Separate lightweight vs full pipeline

#### 4.2 Streaming Layer

* Remove Kafka `ResponseStreamer`
* Introduce `StreamSink` abstraction
* Implement `RedisStreamSink`

#### 4.3 gRPC Server

* Define new gRPC endpoints
* Streaming response handling

#### 4.4 API Layer

* Add direct execution endpoint (for API Gateway)

#### 4.5 Persistence

* Define what is stored in RAG DB (direct AI only)

---

### 5. Redis Stream Design

* Key naming conventions
* Event schema
* Message lifecycle (chunk → final)
* Consumer expectations

---

### 6. Data Contracts

Define:

#### Chat Message Schema

#### AI Streaming Event Schema

#### gRPC Request/Response Schema

---

### 7. Migration Strategy

* Step-by-step rollout plan
* Backward compatibility considerations
* Feature flag suggestions (if needed)

---

### 8. Risks & Edge Cases

* Failure handling (RAG crash mid-stream)
* Redis disconnects
* Partial responses
* Duplicate messages
* Ordering guarantees

---

### 9. Optional Improvements (If Applicable)

* Session context support for Direct AI
* Model selection per mode
* Rate limiting
* Observability/logging improvements

---

## ⚠️ Constraints

* Do NOT assume missing functionality — derive from code
* Do NOT rewrite entire system — focus on incremental refactor
* Maintain compatibility with existing database schemas where possible
* Avoid introducing unnecessary technologies

---

## ✅ Output Requirements

* Output MUST be in Markdown (`.md`)
* Must be **implementation-focused**, not theoretical
* Must include **file-level or module-level references** where possible
* Must be structured and readable

---

## 🧠 Final Goal

Produce a plan that can be directly used to:

> Guide a second execution phase where you will implement the changes across all services.

---

**Start by deeply analyzing the codebase before proposing any changes.**
