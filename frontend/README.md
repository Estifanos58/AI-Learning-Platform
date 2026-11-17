# AI Learning Platform - Web Client

A modern Next.js 14 / React 19 web application for the AI Learning Platform, featuring responsive 3-pane workspaces, real-time conversational chat, Direct AI multi-provider execution, document management, and secure JWT-based authentication.

---

## 1. Overview & Capabilities

The frontend connects directly to the platform's public API Gateway via configurable REST endpoints, Server-Sent Events (SSE), and authenticated WebSockets:

- **Authentication & RBAC:** Student registration, login, token refresh, password recovery, and email verification.
- **Interactive Workspace:** 3-pane responsive layout with collapsible sidebars, folder trees, and document browsers.
- **Real-Time AI Chat:** Streaming AI responses via Server-Sent Events (SSE) and live chatrooms over secure WebSockets.
- **AI Studio & Direct Execution:** Multi-model AI execution supporting Gemini, DeepSeek, and Groq with configurable execution modes (`chat` and `deep`).
- **File & Document Management:** Multipart file upload, PDF viewing, and document sharing.

---

## 2. Configuration & Environment Variables

The frontend reads configuration through standard Next.js environment variables.

Copy `.env.example` or create a `.env.local` file:

```bash
cp .env.example .env.local
```

### Supported Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api` | Public base URL of the API Gateway |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8080` | Base URL for WebSocket connections |

> [!NOTE]
> All client requests pass through the API Gateway at `NEXT_PUBLIC_API_URL` rather than accessing backend internal microservice ports directly.

---

## 3. Local Development

### Prerequisites
- Node.js 20.9.0+ (tested with Node 20 and Node 24)
- npm 10+

### Installation & Run

```bash
# Install dependencies
npm ci

# Start development server
npm run dev

# Run production build
npm run build
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 4. Docker Deployment

The frontend includes a multi-stage production `Dockerfile`:

```bash
# Build Docker image
docker build -t aiplatform-frontend .

# Run container
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:8080/api aiplatform-frontend
```

When running with the root `docker-compose.yml`, the frontend service is orchestrated automatically alongside the backend and data services.
