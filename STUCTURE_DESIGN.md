# Project: AI-Learning-Platform-UI

## 1. Overview
- What the system does: A TypeScript Next.js 16 (App Router) frontend skeleton for an AI-powered learning workspace. It provides a 3-pane workspace (left folder tree, center file viewer, right AI chat panel), file/folder CRUD UI, PDF viewer shell, profile and settings pages, authentication flows, and an adapter-style API gateway that talks to either a local backend or in-memory mock services.
- Problem it solves: Provides a production-like, strongly-typed UI surface for prototyping user flows and integration patterns for document-centric AI interactions (file management, AI-assisted chat & streaming) without requiring a backend to be present.
- System type: ai

## 2. Architecture Summary
- High-level architecture style: Monolithic single-repository web application built with Next.js App Router; layered client/server components with a clear adapter/facade for backend interactions (gatewayApi). Realtime and streaming are handled by WebSocket and Server-Sent Events (SSE).
- Key architectural patterns used:
  - Provider/Context pattern for cross-cutting concerns (`AuthProvider`, `WorkspaceProvider`).
  - Adapter/Facade: `gatewayApi` centralizes calls to `auth`, `files`, `profile`, `chat` endpoints and exposes mock fallbacks.
  - Client-side caching & revalidation: `swr` used for files/folders.
  - Streaming/Realtime: `fetch-event-source` (SSE) and WebSocket for AI streaming and realtime chat events.
  - Form-data upload with XHR for progress reporting.
- Data flow summary (request lifecycle):
  1. UI component calls a hook (e.g., `useGatewayFiles`, `useGatewayChat`).
  2. Hook invokes `gatewayApi.<domain>` which delegates to `gateway-<domain>.ts`.
  3. `gateway-core` builds request (`executeRequest`) and attaches `Authorization` header, `X-Correlation-ID` and content-type.
  4. `executeRequest` performs `fetch` to `API_BASE_URL` (default `http://localhost:8080/api/internal`) or falls back to mock services in `src/lib/mocks` when used by dev code.
  5. On 401, `executeRequest` triggers `attemptRefresh` which posts to `/auth/refresh` using the browser cookie `app_refresh_token`; a new access token is saved to cookies/localStorage on success and the original request is retried once.
  6. For streaming AI responses, `chatApi.streamAiResponse` uses `fetchEventSource` (SSE) to receive chunked events and the `useGatewayChat` hook converts chunks into incremental UI updates. WebSocket is used for chatroom-level realtime events.

## 3. System Components
List of major components and responsibilities (explicit inputs/outputs/dependencies).

### Component: Next.js App Router (`/app`)
- Responsibility: Host server and client components, provide routing, server-side rendering and edge middleware integration.
- Inputs: HTTP requests, cookies, incoming route parameters.
- Outputs: HTML/React server components, server-side fetch results.
- Dependencies: `next@16`, `react@19`, `src/lib/api/server`, `middleware.ts`, root `layout.tsx` providers.

### Component: Middleware (`middleware.ts`)
- Responsibility: Protect `/app` routes by checking presence of `app_access_token` or `app_refresh_token` cookies and redirect unauthenticated requests to `/auth/login` with a redirect param.
- Inputs: HTTP request, cookies.
- Outputs: `NextResponse.next()` or redirect response to `/auth/login`.
- Dependencies: `next/server` APIs.

### Component: Auth Provider & Context (`src/contexts/auth.tsx`)
- Responsibility: Client session lifecycle management (restore, persist, login, logout, signup), localStorage persistence and client-side cookie management for access/refresh tokens.
- Inputs: `gatewayApi.auth` results, localStorage, document cookies.
- Outputs: `AuthSession` state, cookies `app_access_token`/`app_refresh_token`, events (`auth_token_refreshed`).
- Dependencies: `gatewayApi`, `Auth` mock services in dev, client APIs.

### Component: Gateway API (`src/lib/api/gateway.ts` and submodules)
- Responsibility: Typed facade exposing domain clients: `auth`, `files`, `profile`, `chat`. Central point for error mapping and mock fallbacks.
- Inputs: typed payloads from hooks/components and `token` where required.
- Outputs: typed responses (`AuthSession`, `FileItem`, `ChatMessage`, etc.) or thrown `GatewayApiError`.
- Dependencies: `gateway-core`, domain modules (`gateway-auth`, `gateway-files`, `gateway-chat`, `gateway-profile`), `zod` schemas for input validation.

### Component: Gateway Core (`src/lib/api/core/*`)
- Responsibility: Low-level request plumbing: header composition, correlation id, 401 refresh retry, XHR form uploads with progress.
- Inputs: path, RequestOptions (method, body, token, signal, headers).
- Outputs: `Response` or parsed domain object; throws on non-ok responses.
- Dependencies: `attemptRefresh` logic, `API_BASE_URL` config.

### Component: Mock Services (`src/lib/mocks/*`)
- Responsibility: In-memory deterministic replacements for backend endpoints (auth, files, chat, profile) with configurable artificial delay (~300ms) for realistic UX.
- Inputs: domain requests (signup, login, list files, send message, etc.).
- Outputs: domain-shaped responses used by `gatewayApi.mockFallbacks` or direct mock calls.
- Dependencies: None external; used by `gatewayApi` and unit/demo flows.

### Component: Chat Subsystem (`chatApi`, `useGatewayChat`)
- Responsibility: Message CRUD, realtime events, AI execution and streaming via SSE and websocket.
- Inputs: `SendMessageRequest`, `token`, optional file payloads, chatroomId.
- Outputs: `ChatMessage[]`, streaming chunk callbacks, websocket `ChatRealtimeEvent` ingestion.
- Dependencies: `fetch-event-source`, WebSocket, `gateway-core`.

### Component: File Subsystem (`filesApi`, `useGatewayFiles`, `useGatewayFile`)
- Responsibility: Folder/file listing, metadata updates, uploads with progress, file previews.
- Inputs: File objects, folderId, token.
- Outputs: `FileItem` objects, upload progress events.
- Dependencies: `FormData` upload (XHR wrapper in `sendFormDataRequest`), `gateway-file-utils` (size checks, base64 conversion), SWR for caching.

### Component: Workspace UI (`src/features/workspace`)
- Responsibility: 3-pane layout engine (tab/pane split model), UI glue for opening/closing tabs, exposing workspace state (selected file, sidebar/chat toggles, preview urls).
- Inputs: user events (click/open/upload), hook data (files, chat messages).
- Outputs: rendered panes, tab state, calls to `gateway` hooks.
- Dependencies: `WorkspaceProvider`, layout reducer, UI components in `components/ui`.

### Component: Component Library (`/components/ui` and `src/components/common`)
- Responsibility: Shared UI primitives, design-system building blocks (buttons, dialogs, toasts, inputs) for consistent styling and accessibility.
- Inputs: props from pages/components.
- Outputs: styled UI primitives.
- Dependencies: `tailwindcss`, `@radix-ui/*`, `clsx`, `shadcn`-style patterns.

### Component: Server Helpers (`src/lib/api/server.ts`)
- Responsibility: Helpers for server-side fetches in Next.js server components (getServerAccessToken, gatewayServerGet) with Next revalidation tagging.
- Inputs: server cookie store.
- Outputs: data for server components or null when unauthenticated.
- Dependencies: `API_BASE_URL`, Next `cookies()`.

## 4. Tech Stack (EXPLICIT)
- Language: TypeScript (>=5.7)
- Frameworks: Next.js 16 (App Router), React 19
- Styling: Tailwind CSS v4, PostCSS
- Component primitives: Radix UI, shadcn/ui style components
- State & Data Fetching: SWR, React Context API
- Validation: Zod
- Streaming / Realtime: fetch-event-source (SSE), WebSocket
- Uploads: XMLHttpRequest (form-data progress) + client-side base64 chunking utilities
- Observability & Telemetry: @vercel/analytics, correlation-id headers
- Other libs: clsx, date-fns, recharts, jszip, mammoth, read-excel-file, sonner (toasts)
- Package manager / tooling: pnpm, TypeScript, ESLint (lint script present)
- Dev / Local API: In-memory mock services under `src/lib/mocks` (300ms artificial delay)

## 5. Key Engineering Decisions
### Decision: Use a gateway facade + typed domain modules
- Context: Frontend must call many API endpoints with varying shapes.
- Decision: Central `gatewayApi` with per-domain modules and Zod schemas for runtime input validation.
- Reason: Clear separation between UI and transport, single place to add error mapping, and easy mock fallback injection for dev.
- Trade-offs: Slight indirection and duplication of DTO shapes; requires maintenance when backend API evolves.

### Decision: Cookie-based access + refresh token strategy with client-side refresh
- Context: Need to protect routes and maintain sessions across SSR and CSR.
- Decision: Store access/refresh tokens in cookies (`app_access_token`, `app_refresh_token`) and persist session in localStorage; middleware inspects cookies for server-redirects.
- Reason: Enables server-side route guard in Next.js middleware and server components (via `getServerAccessToken`) while allowing client to refresh tokens transparently.
- Trade-offs: Cookies are set from client JS (not HttpOnly) in the skeleton for demo convenience — acceptable for local prototyping but not production-safe; server-set HttpOnly cookies are recommended for production.

### Decision: Combine SSE and WebSocket for streaming & realtime
- Context: AI responses require chunked streaming; chatrooms require realtime events.
- Decision: Use SSE (`fetch-event-source`) for AI streaming endpoints and WebSocket for generic realtime chatroom events.
- Reason: SSE makes ordered streaming of textual chunks simple; WebSocket supports bidirectional events for presence/typing and room-level messages.
- Trade-offs: SSE is unidirectional and not suited for bidirectional commands; operational complexity when scaling (WebSocket requires sticky sessions or a managed pub/sub layer).

### Decision: Provide robust client-side upload experience (XHR + chunked base64 utility)
- Context: File uploads must show progress and enforce size limits.
- Decision: Use `XMLHttpRequest` for uploads (progress events), client-side size assertion (`MAX_UPLOAD_FILE_SIZE_BYTES = 200MB`) and helper `fileToBase64` for use-cases that need base64.
- Trade-offs: XHR supports progress natively; mixing fetch and XHR adds two code paths; base64 conversion increases memory footprint but is optional and used only when required.

## 6. Data & Flow Details
- Authentication lifecycle:
  - Signup/Login flows call `gatewayApi.auth.*` which POSTs to `/auth/*`.
  - Successful login/refresh returns `AuthSession` (accessToken, refreshToken, expiresIn, user). Client stores session in `localStorage` and writes `app_access_token`/`app_refresh_token` cookies.
  - `middleware.ts` runs on each request to `/app` and redirects to `/auth/login` if both cookies are absent.
  - `executeRequest` detects 401 responses and calls `attemptRefresh` that posts `/auth/refresh` (using the client-stored refresh cookie). If refresh succeeds, cookies are updated and the original request retried once.

- Regular API request flow:
  1. Hook/component calls `gatewayApi` method.
  2. `gateway-core` validates or serializes the request, sets `X-Correlation-ID`, `Authorization` header (Bearers), and calls `fetch` or XHR.
  3. If response code is non-200, body is parsed (if JSON) and converted into `GatewayApiError` with `status`, `code`, `message`, and optional `details`.
  4. Hooks map results into UI state (SWR mutate, setState, toasts on error).

- File upload flow:
  - `useGatewayFiles.uploadFiles` iterates files and calls `gatewayApi.files.uploadFile`, which uses `sendFormDataRequest` (XHR) to send `FormData` with progress reporting.
  - Size validated by `assertUploadFileSize`. Client uses `onProgress` to surface percent and overall progress.

- Chat / AI streaming flow:
  - `sendMessage` posts a message via `gatewayApi.chat.sendMessage`.
  - If `aiModelId` is present, client creates a placeholder message and calls `gatewayApi.chat.streamAiResponse` which opens SSE via `fetchEventSource`.
  - SSE events (`AI_CHUNK`, `AI_COMPLETED`, `AI_FAILED`) are converted into incremental UI updates by `useGatewayChat` (`appendOrCreateAiChunk`, `completeAiMessage`).
  - Realtime events (typing, newMessage, newChatroom) are received via WebSocket using `openChatSocket` and handled by `useGatewayChat`'s reconnection and per-room socket logic.

- Idempotency / retries / caching:
  - 401 handling: automatic refresh + single retry.
  - SWR is used for `folders` and `files` with deduping and revalidation intervals (default revalidate settings used). No generic exponential retry policy implemented for transient 5xx errors.

## 7. Performance & Metrics (REAL or ESTIMATED)
- Latency:
  - Mock services introduce ~300ms artificial delay (configurable in `src/lib/mocks`).
  - Typical UI operation (list folders, update metadata) with mock backend: 300–600ms (including processing and UI update).
  - AI streaming chunk arrival depends on model/provider; expect chunks every 50–500ms when a backend is used.
- Throughput:
  - Single-client throughput for messages is bounded by WebSocket and backend processing; the frontend can handle tens of chat messages per second locally.
  - File upload throughput constrained by client network; max upload size enforced at 200MB.
- Error rate: Not instrumented in skeleton; mock errors are deterministic when simulated. Production error rate depends on backend.
- Cost impact: UI-only skeleton has negligible infra cost; production requires costs for AI provider calls (dominant), storage (file uploads), and WebSocket/SSE infrastructure.
- Improvements observed/possible:
  - Using SWR reduces repeated listing calls; server-side rendering reduces first-load latency for protected pages.

## 8. Failure Modes & Reliability
- Possible failure scenarios:
  - Missing/expired tokens → middleware redirects to login or client refresh fails → session cleared.
  - Network drop / SSE or WebSocket disconnect → reconnection logic with 2s retry implemented (room and user sockets), streams are cancellable via AbortController.
  - File upload failure → XHR `onerror` and abort handlers, progress resets and retry UI required.
  - AI backend error during streaming → `onFailed` handlers mark message as non-loading and surfaces error string in UI.
- How the system handles them:
  - Automatic refresh: `executeRequest` + `attemptRefresh` to obtain a fresh access token and retry original request once.
  - Reconnect strategy: `useGatewayChat` implements per-socket reconnect with timers and cleans timers on disposal.
  - Graceful UI: placeholder messages for streaming, `isLoading` flags, client error messages surfaced via component-level state/toasts.
- Fallback mechanisms:
  - Local mock services provide functional fallback during development when the backend is unavailable.
- Retry strategies:
  - 401 → attempt refresh + single retry.
  - WebSocket reconnection with fixed 2s backoff (can be improved to exponential backoff).
- Observability approach:
  - Every request carries `X-Correlation-ID` via `createCorrelationId()`.
  - `GatewayApiError` centralizes parsed error payloads.
  - `@vercel/analytics` present for basic telemetry; no structured error logging (e.g., Sentry) included in skeleton.

## 9. Scalability Strategy
- How it scales:
  - UI layer scales horizontally via multiple Next.js server instances or serverless functions.
  - WebSocket connections require a dedicated connection service (node cluster behind a load balancer with sticky sessions or a managed real-time layer like Pusher/Ably with server pub/sub).
  - SSE streams are short-lived HTTP requests; scale by horizontally scaling the streaming backend and using a message broker for fanout.
- Bottlenecks and mitigation:
  - AI provider calls are the primary scaling/cost bottleneck → mitigate with provider sharding, queueing, rate-limiting, and cached responses for repeated prompts.
  - File uploads create bandwidth and storage demands → offload to object storage (S3) via pre-signed URLs; stream processing via background workers.

## 10. Security Considerations
- Auth / AuthZ:
  - Session tokens are stored in cookies and localStorage in the skeleton. The middleware uses cookies to gate server-side routes.
  - For production: move to server-set HttpOnly, Secure cookies for refresh tokens and store access tokens in memory or short HttpOnly cookies.
- Data protection:
  - File uploads are size-limited (200 MB). MIME type is inferred client-side but server must re-validate and scan uploads.
  - Zod validation is used for input validation of API request payloads.
- Abuse prevention:
  - No rate-limiting in skeleton; production must implement throttling at API gateway and per-account quotas for AI calls.
- Other notes:
  - CSRF: cookie-based approach introduces CSRF risk; add same-site/CSRF tokens or use double-submit strategy in production.

## 11. Trade-offs Matrix
- Dimension: Session storage approach
  - Selected approach: Cookie + localStorage (client-set cookies) for demo convenience
  - Benefit: Easy server-side detection in middleware and fast local development without a backend
  - Compromise: Not secure (cookies not HttpOnly); higher XSS/CSRF risk compared to server-set HttpOnly cookies

- Dimension: Streaming transport
  - Selected approach: SSE for AI streams, WebSocket for realtime chat events
  - Benefit: Simple ordered text streaming (SSE) and full-duplex realtime (WebSocket)
  - Compromise: Operational complexity when scaling; need managed infra or sticky sessions and pub/sub glue

## 12. What I Would Improve
- Move token management to server-issued HttpOnly cookies (refresh tokens) and limit client-side token persistence to in-memory or short-lived access tokens.
- Add structured observability: integrate a centralized error/telemetry system (Sentry/Datadog), log correlation with `X-Correlation-ID`, and add telemetry for SSE/WebSocket errors and reconnection events.
- (extra) Harden retry/backoff strategies for SSE/WebSocket, add exponential backoff, jitter, and circuit-breaker around AI provider calls.

## 13. Project Metadata (STRICT — USED BY PARSER AI)
```yaml
project:
  title: "AI-Learning-Platform-UI"
  type: "ai" # distributed-system | ai | platform | performance | full-stack
  role: "Frontend Engineer"
  duration: "2 months"
  year: 2026
  featured: false

metrics:
  - label: "mock_response_latency_ms"
    value: "300"
  - label: "max_upload_size_mb"
    value: "200"

techStack:
  - "TypeScript"
  - "Next.js 16 (App Router)"
  - "React 19"
  - "Tailwind CSS v4"
  - "SWR"
  - "Zod"
  - "fetch-event-source (SSE)"
  - "WebSocket"
  - "pnpm"
  - "Radix UI / shadcn/ui"

tags:
  - "nextjs"
  - "typescript"
  - "ai"
  - "frontend"
  - "sse"
  - "websocket"
```

## 14. Optional Diagram Description (IMPORTANT)
Nodes:

* id: client
  label: Browser / Client
  description: React client code (client components, hooks, UI) that performs user interactions, XHR uploads, opens SSE and WebSocket connections.

* id: nextjs
  label: Next.js App (Server + App Router)
  description: Server components, root layout, middleware and server helper APIs (`getServerAccessToken`, server-side fetch with revalidation).

* id: auth_ctx
  label: AuthProvider / Auth Context
  description: Client-side session manager that persists session to localStorage and writes cookies for middleware.

* id: gateway
  label: Gateway API (client facade)
  description: Facade for `auth`, `files`, `chat`, `profile` modules and client-side validation (Zod). Uses `gateway-core` to send HTTP requests.

* id: mock_services
  label: In-memory Mock Services
  description: Deterministic mock implementations for auth/files/chat/profile used during development (300ms delay).

* id: backend_api
  label: External Backend API
  description: Real backend (optional) at `API_BASE_URL` handling `/auth`, `/files`, `/chat`, `/ai` and SSE/WS endpoints.

* id: ai_backend
  label: AI Provider Backend
  description: External AI provider(s) used by backend to generate streaming responses.

* id: storage
  label: File Storage (S3 or equivalent)
  description: Persistent object storage for uploaded files (not implemented in skeleton, recommended prod target).

Edges:

* source: client
  target: gateway
  label: "API calls (fetch) via gatewayApi; includes Authorization and X-Correlation-ID"

* source: gateway
  target: mock_services
  label: "Local fallback responses (dev mode)"

* source: gateway
  target: backend_api
  label: "HTTP requests to API_BASE_URL (/api/internal)"

* source: backend_api
  target: ai_backend
  label: "Delegates AI execution and streaming"

* source: client
  target: backend_api
  label: "WebSocket open (chat realtime) & SSE open (AI streaming)"

* source: backend_api
  target: storage
  label: "File upload storage (presigned upload or direct storage)"

---

Notes: This STUCTURE_DESIGN.md is intentionally technical and focused on architecture, flows and engineering trade-offs. Use the YAML metadata block for automated parsing.
