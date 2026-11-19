# AI Learning Platform - Web Client

A modern **Next.js 16 / React 19 / TypeScript** web application for the AI Learning Platform, featuring persisted multi-tab split-pane workspaces, safe Markdown and DOCX rendering, syntax-highlighted AI responses with citations, real-time WebSocket chat, Direct AI multi-provider execution, and server-managed `HttpOnly` cookie + CSRF authentication.

---

## 1. Overview & Capabilities

- **Cookie-First Authentication & CSRF Protection:** Uses server-managed `HttpOnly`, `Secure`, `SameSite` cookies (`credentials: 'include'`) and double-submit `X-CSRF-Token` headers on state-changing requests. No JWTs are stored in `localStorage` or browser-readable cookies.
- **Persistent Workspace Layout:** Saves open tabs, split-pane layout tree, split ratios, sidebar widths, and preferred AI model across reloads in `localStorage` with schema validation and bounds clamping.
- **Safe Document & AI Rendering:**
  - DOCX previews (`mammoth`) are sanitized via DOMPurify strict allowlists and URL protocol filtering (`src/lib/security/sanitize.ts`).
  - Markdown files and AI responses render with `rehype-sanitize`, `remark-gfm` tables, `rehype-highlight` syntax highlighting with copy buttons, and structured source citations.
- **Real-Time Chat & Direct AI Streaming:** Connects to the API Gateway over SSE (`/api/ai/executions/{id}/stream`, `/api/chat/messages/{id}/stream`) and WebSockets (`/ws/chat`) using cookie authentication.

---

## 2. Package Manager & Scripts

This project is standardized on **npm** (`package-lock.json`).

```bash
# Install exact dependencies
npm ci

# Start local development server
npm run dev

# Type checking
npm run typecheck

# ESLint
npm run lint

# Vitest unit & regression tests
npm test

# Production build
npm run build
```

---

## 3. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api` | Public base URL of the API Gateway |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8080` | Public WebSocket base URL of the API Gateway |
| `PORT` | `3000` | Server port inside production container |

---

## 4. Docker Deployment

The multi-stage `Dockerfile` uses `node:22-alpine`, installs dependencies strictly via `npm ci`, runs as non-root user `nextjs`, and defines an HTTP `HEALTHCHECK`:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080/api \
  --build-arg NEXT_PUBLIC_WS_URL=ws://localhost:8080 \
  -t aiplatform-frontend .
```
