# RAG Service

Enterprise-grade Retrieval-Augmented Generation (RAG) microservice for the AI Learning Platform.

## Architecture

```
rag-service/app/
├── main.py                    # FastAPI entry point + lifespan
├── config.py                  # Pydantic-settings configuration
├── api/
│   └── rag_controller.py      # REST endpoints (ingest, retrieve, cancel, etc.)
├── orchestration/
│   ├── planner_agent.py       # Selects agents for a query
│   ├── workflow_builder.py    # Instantiates agent pipeline from plan
│   ├── pipeline_executor.py   # Runs the full RAG pipeline end-to-end
│   └── response_aggregator.py # Merges multi-agent outputs
├── agents/
│   ├── base_agent.py          # Abstract base + shared helpers
│   ├── research_agent.py      # Q&A with citations
│   ├── summarize_agent.py     # Concise summarisation
│   ├── exam_agent.py          # Quiz/exam generation
│   ├── explanation_agent.py   # In-depth concept explanation
│   ├── citation_agent.py      # Structured citation list
│   └── tutor_agent.py         # Socratic tutoring mode
├── retrieval/
│   ├── query_embedder.py      # Encodes queries via HF TEI
│   ├── vector_search.py       # Qdrant search with auth filter
│   └── reranker.py            # Cross-encoder reranking
├── ingestion/
│   ├── kafka_consumer.py      # Multi-topic consumer (background thread)
│   ├── file_loader.py         # Safe file reading from shared volume
│   ├── extractor.py           # Kreuzberg text extraction
│   ├── chunker.py             # Recursive character text splitter
│   └── embedding_pipeline.py  # Batch embed + Qdrant upsert
├── llm/
│   ├── base_provider.py       # Abstract provider interface
│   ├── provider_router.py     # Routes model_id → provider
│   ├── openai_provider.py     # OpenAI (GPT-4o, etc.)
│   ├── gemini_provider.py     # Google Gemini
│   ├── deepseek_provider.py   # DeepSeek
│   └── local_provider.py      # Ollama / vLLM / llama.cpp
├── security/
│   ├── file_validator.py      # Path traversal + content type checks
│   └── user_permission_checker.py  # gRPC call to file-service
├── streaming/
│   └── response_streamer.py   # Kafka event publisher for chunks/completion
├── usage/
│   ├── credits.py             # Credit accounting
│   └── token_meter.py         # Token counting + cost estimation
└── storage/
    ├── qdrant_client.py       # Async Qdrant wrapper
    └── models.py              # Pydantic models
```

## Key Flows

### File Ingestion (file.uploaded.v2)
```
Kafka event → file_loader → extractor → chunker → embedding_pipeline → Qdrant
```

### AI Chat (ai.message.requested.v2)
```
Kafka event → permission_checker → vector_search → reranker →
planner_agent → workflow_builder → [agents] → response_aggregator →
response_streamer → Kafka (chunks + completion)
```

### Cancellation (ai.message.cancelled.v1)
```
Kafka event → PipelineExecutor.cancel(request_id) → abort pipeline → publish cancelled event
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka broker |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant endpoint |
| `TEI_BASE_URL` | `http://localhost:8080` | HF TEI embedding service |
| `OPENAI_API_KEY` | – | OpenAI API key |
| `GEMINI_API_KEY` | – | Google Gemini API key |
| `DEEPSEEK_API_KEY` | – | DeepSeek API key |
| `LOCAL_LLM_URL` | – | Ollama/vLLM base URL |
| `FILE_STORAGE_ROOT_PATH` | `/data` | Shared file storage mount |
| `GRPC_FILE_SERVICE_ADDRESS` | `localhost:9092` | file-service gRPC address |
| `RAG_DATABASE_URL` | postgresql+asyncpg://… | Usage/keys DB |

## Running Locally

```bash
pip install -r requirements.txt
RAG_PORT=8087 uvicorn app.main:app --reload
```

## Running with Docker Compose

```bash
docker compose --profile rag up
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/rag/ingest` | Manually trigger file ingestion |
| POST | `/api/rag/retrieve` | Retrieve relevant chunks |
| DELETE | `/api/rag/vectors/{file_id}` | Remove vectors for a file |
| POST | `/api/rag/cancel/{request_id}` | Cancel active generation |
| GET | `/api/rag/providers` | List available LLM providers |
| GET | `/api/rag/collection/info` | Qdrant collection stats |
| GET | `/health` | Health check |
| GET | `/ready` | Readiness probe |
