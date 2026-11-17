# NotebookLM - AI Learning Platform (UI Skeleton)

A **Next.js 16 App Router** frontend skeleton for an AI Learning Platform inspired by NotebookLM. This is a **UI-only implementation** with mock data and no backend integration.

## Overview

This project provides a complete, production-ready **skeleton** with:

- ✅ Full authentication flow (signup, login, password reset)
- ✅ 3-pane workspace layout (sidebar, main content, chat panel)
- ✅ Folder and file management system
- ✅ PDF viewer module (shell/placeholder)
- ✅ AI chat panel with message history
- ✅ User profile pages
- ✅ Settings scaffold
- ✅ Reusable component library
- ✅ Strong TypeScript typing
- ✅ Mock service layer with realistic async patterns

## Project Structure

```
src/
├── app/                           # Next.js 16 App Router
│   ├── (public)/                  # Public routes (no auth required)
│   │   ├── page.tsx              # Landing page
│   │   └── auth/                 # Authentication pages
│   │       ├── login/
│   │       ├── signup/
│   │       ├── verify-email/
│   │       ├── forgot-password/
│   │       └── reset-password/
│   └── (protected)/               # Protected routes (auth required)
│       └── app/
│           ├── layout.tsx         # Auth guard layout
│           ├── page.tsx           # Redirect to workspace
│           ├── workspace/         # Main workspace
│           ├── profile/           # Profile pages
│           └── settings/          # Settings page
│
├── src/
│   ├── contexts/                  # Global context providers
│   │   └── auth-context.tsx      # Auth state management
│   │
│   ├── features/                  # Feature-based modules
│   │   ├── workspace/
│   │   │   ├── components/       # Workspace UI components
│   │   │   │   ├── app-shell.tsx
│   │   │   │   ├── top-bar.tsx
│   │   │   │   ├── left-sidebar.tsx
│   │   │   │   ├── folder-tree.tsx
│   │   │   │   └── file-list.tsx
│   │   │   ├── chat/             # Chat module
│   │   │   │   ├── right-chat-panel.tsx
│   │   │   │   ├── chat-header.tsx
│   │   │   │   ├── chat-message-list.tsx
│   │   │   │   ├── chat-message-item.tsx
│   │   │   │   └── chat-composer.tsx
│   │   │   ├── workspace-context.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   └── pdf-viewer/           # PDF viewer module
│   │       ├── pdf-viewer-shell.tsx
│   │       ├── pdf-toolbar.tsx
│   │       ├── pdf-page-viewport.tsx
│   │       └── index.ts
│   │
│   ├── lib/
│   │   ├── types/                # TypeScript type definitions
│   │   │   ├── auth.ts
│   │   │   ├── files.ts
│   │   │   ├── chat.ts
│   │   │   ├── profile.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── mocks/                # Mock services (in-memory)
│   │   │   ├── auth-mock-service.ts
│   │   │   ├── file-mock-service.ts
│   │   │   ├── chat-mock-service.ts
│   │   │   ├── profile-mock-service.ts
│   │   │   └── index.ts
│   │   │
│   │   └── utils/                # Utility functions
│   │
│   └── components/
│       ├── ui/                   # shadcn/ui components (auto-generated)
│       └── common/
│           └── states.tsx        # Loading, empty, error states
```

## Key Features

### 1. Authentication System
- Full signup flow with role selection
- Email verification
- Login/logout
- Password reset flow
- Mock service with artificial delays

**Demo Credentials:**
- Email: `demo@example.com`
- Password: `password123`

### 2. Workspace Layout (3-Column)

**Left Sidebar:**
- Folder tree with CRUD operations
- File list with selection
- Create/rename folders
- 40% width, collapsible

**Center Panel:**
- PDF viewer shell (placeholder)
- File toolbar
- Empty state when no file selected
- Responsive layout

**Right Chat Panel:**
- Message history
- AI model selector (GPT-4, Claude 3, etc.)
- Message composer
- Typing indicator placeholder
- 30% width, collapsible

### 3. Mock Data & Services

All data is **in-memory** and **deterministic**:

- **Auth Service:** User registration, login, email verification, password reset
- **File Service:** Folder/file CRUD, soft deletes, mock sharing
- **Chat Service:** Message history, AI model selection, chatroom creation
- **Profile Service:** User profiles with visibility control

Each service includes **~300ms artificial delay** for realistic UX.

### 4. Routes

**Public Routes:**
- `/` - Landing page with CTA
- `/auth/login` - Sign in
- `/auth/signup` - Create account
- `/auth/verify-email` - Email verification
- `/auth/forgot-password` - Request password reset
- `/auth/reset-password` - Complete password reset

**Protected Routes:**
- `/app` - Redirect to workspace
- `/app/workspace` - Main 3-pane workspace
- `/app/profile` - View profile
- `/app/profile/edit` - Edit profile
- `/app/settings` - Settings (scaffold)

### 5. State Management

- **Auth Context:** Global session state, login/logout
- **Workspace Context:** Selected folder/file, sidebar/chat panel toggle, chatroom ID
- Component-level state for forms, async operations

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Testing the Flow

1. **Landing Page:** Click "Get Started" or "Sign In"
2. **Sign Up:** Create a test account (or use demo credentials)
3. **Verify Email:** Use any 5+ character token (e.g., `demo-token`)
4. **Workspace:** See pre-loaded mock folders and files
5. **Select File:** Click a file to view PDF shell
6. **Chat:** Ask questions about the document in right panel
7. **Profile:** Edit profile and view settings

## Architecture Decisions

### Modular Design
- Each feature in its own folder (`/features`)
- Clear boundaries and exports via index files
- Reusable component library in `/components/common`

### Strong Typing
- Separate `/lib/types` for all data contracts
- Matched mock services to frontend types
- Ready for backend integration without changes

### Mock Service Layer
- Promises-based, async pattern (matches real APIs)
- In-memory data with deterministic IDs
- Artificial delays (~300ms) for realistic UX
- Easy to swap for real HTTP clients later

### State Management
- Context API for global state (Auth, Workspace)
- Component state for local UI (forms, modals)
- No external state library needed for skeleton

### Responsive Design
- Desktop-first (3-column layout)
- Mobile: Panels become drawers/stacked
- Sidebar and chat collapse on small screens

## Future Enhancements

This skeleton is designed for **easy backend integration:**

1. Replace mock services with real HTTP clients (fetch, axios, SWR)
2. Connect auth to real JWT/session system
3. Add PDF.js or react-pdf for real PDF rendering
4. Integrate WebSocket for real-time chat
5. Add user authentication with password hashing
6. Connect to database for persistence
7. Add file upload/storage integration
8. Implement search and filtering

## Technology Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **State:** React Context API
- **Type Safety:** Strict TypeScript

## Design

- Clean, minimal, futuristic aesthetic
- High contrast, clarity-focused
- Smooth transitions and hover states
- Accessible keyboard navigation
- Dark mode support via Tailwind

## Development Notes

- All mock data is cleared on page refresh
- Messages accumulate during session (not persisted)
- Folders have soft-delete flag (for future recovery)
- Files are linked to folders (referential integrity)
- Profile visibility controls (PUBLIC, UNIVERSITY_ONLY, PRIVATE)

## License

This is a demo/skeleton project. Feel free to use as a foundation for your own app.

---

**Ready to go!** Start with `/auth/signup` to create an account and explore the workspace.
# AI-Learning-Platform-UI
# AI-Learning-Platform-UI
