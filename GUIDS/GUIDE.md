# GUIDE.md

## Run Services with Docker Compose

## 1) Prerequisites
- Docker + Docker Compose plugin installed
- Ports available: `8080`, `9090`, `9091`, `9092`, `9095`, `5432-5435`, `6379`, `6380`, `9092` (Kafka)

## 2) Prepare JWT keys (required)
`auth-service` signs tokens and `api-gateway` verifies them, so both must share the same public key.

Run from project root:

```bash
mkdir -p auth-service/src/main/resources/keys api-gateway/src/main/resources/keys
openssl genrsa -out auth-service/src/main/resources/keys/private_key.pem 2048
openssl rsa -in auth-service/src/main/resources/keys/private_key.pem -pubout -out auth-service/src/main/resources/keys/public_key.pem
cp auth-service/src/main/resources/keys/public_key.pem api-gateway/src/main/resources/keys/public_key.pem
```

## 3) Start all core services

From project root:

```bash
docker compose up --build -d
```

Check status:

```bash
docker compose ps
```

View logs (example):

```bash
docker compose logs -f api-gateway
docker compose logs -f auth-service
```

## 4) Optional RAG container
`rag-service` is optional and behind a profile.

```bash
docker compose --profile rag up --build -d rag-service
```

## 5) Stop and clean

```bash
docker compose down
```

Remove volumes too (DB reset):

```bash
docker compose down -v
```

---

## Gateway + Frontend Communication

## 1) API Gateway base URL
- Docker-exposed gateway URL: `http://localhost:8080`

## 2) Frontend environment example
Use in your frontend `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## 3) Route groups the frontend should call
- Auth: `/api/auth/*`
- Profile: `/api/profile/*`
- Files: `/api/files/*`
- Chat: `/api/chat/*`

Do not call `/api/internal/*` from frontend.

## 4) Required headers
- `Content-Type: application/json`
- `Accept: application/json`
- `Authorization: Bearer <access_token>` for profile/files/chat routes
- Optional tracing: `X-Correlation-ID: <uuid>`

## 5) CORS
Gateway CORS default allows `http://localhost:3000`.
If frontend runs on another origin, set:

```bash
export GATEWAY_ALLOWED_ORIGINS=http://localhost:3000
```

or set it in `docker-compose.yml` under `api-gateway.environment`.

## 6) Quick health checks
- Gateway: `http://localhost:8080/actuator/health`
- Auth service (inside container network gRPC): `auth-service:9090`
- Profile service: `user-profile-service:9091`
- File service: `file-service:9092`
- Chat service: `chat-service:9095`

## 7) Client contract docs
- [api-gateway/INSTRUCTION_FOR_CLEINT.md](api-gateway/INSTRUCTION_FOR_CLEINT.md)
- [api-gateway/RESPONSE_SCENARIOS.md](api-gateway/RESPONSE_SCENARIOS.md)

---

## Notes on fixed compose issues
- `chat-service -> file-service` gRPC address corrected to `file-service:9092`
- `api-gateway` now includes chat gRPC address + chat shared secret
- `api-gateway` now depends on all backend services
- `rag-service` now has a valid container definition and is optional via profile
