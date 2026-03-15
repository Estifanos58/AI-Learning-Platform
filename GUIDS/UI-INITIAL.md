# UI-INITIAL.md

## Prompt for v0: AI Learning Platform Frontend Skeleton

Build a **Next.js 16 App Router** frontend skeleton for an **AI Learning Platform** inspired by **NotebookLM** (clean, futuristic, productivity-first).  
Use **mock data only** for now (no real backend integration yet).

The output should focus on:
1. App structure and routes
2. Core layout shell
3. Authentication pages
4. Workspace pages (folders/files + PDF viewer + chat panel)
5. Profile pages
6. Reusable UI components with clear modular boundaries
7. Typed mock models and mock service layer

Do not add extra pages beyond the requested ones.

---

## Product Goal (MVP UI Skeleton)

A user can:
- Sign up / sign in
- Land in a Notebook-like workspace
- Create/select folders and files from a foldable side panel
- Open a file in the main area (PDF viewer shell)
- Chat in a right-side panel about the current context
- View/edit their profile

Current phase is UI-only: interactions should update local UI state and/or mock service responses.

---

## Technical Requirements

- Use **Next.js 16** with **App Router**.
- Use **TypeScript**.
- Use a scalable folder architecture suitable for enterprise projects.
- Include placeholders for caching/revalidation and real-time hooks, but keep them mocked.
- Use mock repositories/services in `src/lib/mocks` (or equivalent) to simulate async calls.
- Include loading, empty, and error UI states for main data surfaces.
- Keep components highly modular, especially:
  - PDF viewer module
  - Chat module

---

## Required Routes (Pages)

### Public/Auth routes
- `/` → marketing/entry page with CTA to sign in
- `/auth/login`
- `/auth/signup`
- `/auth/verify-email`
- `/auth/forgot-password`
- `/auth/reset-password`

### Protected app routes
- `/app` → default redirect to `/app/workspace`
- `/app/workspace` → main 3-pane workspace shell
- `/app/workspace/[folderId]` → folder-focused workspace state
- `/app/workspace/[folderId]/[fileId]` → selected file open in viewer
- `/app/profile`
- `/app/profile/edit`
- `/app/settings` (basic scaffold only)

No other routes.

---

## Main Workspace Layout (Critical)

Build a **3-column app shell** for protected routes:

1. **Left panel (foldable/minimizable)**
   - Folder tree/list
   - Files under selected folder
   - Actions: create folder, rename folder, upload file (mock), select file
   - Toggle collapse/expand

2. **Center panel**
   - File display area
   - If no file selected: helpful empty state
   - If file selected: render modular PDF viewer shell component
   - Viewer should be intentionally modular for future advanced features (annotations, highlights, citations)

3. **Right panel (chat, foldable/minimizable)**
   - Chatroom header (current context)
   - Message list (user + assistant)
   - Composer area: text input, model select, optional attachment trigger
   - Typing indicator mock state
   - Toggle collapse/expand

Desktop-first layout, but include basic responsive behavior (panels become drawers/stacked on small screens).

---

## Required UI Components (Create as reusable modules)

- `AppShell`
- `TopBar`
- `LeftSidebar`
- `FolderTree`
- `FileList`
- `FileActions`
- `WorkspaceMain`
- `PdfViewerShell`
- `PdfToolbar`
- `PdfPageViewport` (placeholder)
- `RightChatPanel`
- `ChatHeader`
- `ChatMessageList`
- `ChatMessageItem`
- `ChatComposer`
- `AuthCard`
- `ProfileCard`
- `ProfileForm`
- Common states: `LoadingState`, `EmptyState`, `ErrorState`

Keep each module in a feature-oriented structure.

---

## Data Models (Typed Mock Contracts)

Use mock types derived from backend contracts.

### Auth types
- `Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'`
- `AuthUserSummary`:
  - `id: string`
  - `email: string`
  - `username: string`
  - `role: Role`
  - `status: string`
  - `emailVerified: boolean`
- `AuthSession`:
  - `accessToken: string`
  - `refreshToken: string`
  - `tokenType: string`
  - `accessTokenExpiresInSeconds: number`
  - `user: AuthUserSummary`

### File/Folder types
- `FileType = 'PROFILE_IMAGE' | 'DOCUMENT'`
- `Folder`:
  - `id: string`
  - `ownerId: string`
  - `name: string`
  - `parentId?: string`
  - `deleted: boolean`
  - `createdAt: string`
  - `updatedAt: string`
- `FileItem`:
  - `id: string`
  - `ownerId: string`
  - `folderId: string`
  - `fileType: FileType`
  - `originalName: string`
  - `storedName: string`
  - `contentType: string`
  - `fileSize: number`
  - `storagePath: string`
  - `isShareable: boolean`
  - `deleted: boolean`
  - `createdAt: string`
  - `updatedAt: string`

### Chat types
- `Chatroom`:
  - `id: string`
  - `type: string`
  - `memberIds: string[]`
  - `createdAt: string`
- `ChatMessage`:
  - `id: string`
  - `chatroomId: string`
  - `senderUserId: string`
  - `aiModelId?: string`
  - `content: string`
  - `fileId?: string`
  - `createdAt: string`

### Profile types
- `ProfileVisibility = 'PUBLIC' | 'UNIVERSITY_ONLY' | 'PRIVATE'`
- `UserProfile`:
  - `userId: string`
  - `firstName: string`
  - `lastName: string`
  - `universityId: string`
  - `department: string`
  - `bio: string`
  - `profileImageFileId?: string`
  - `visibility: ProfileVisibility`
  - `reputationScore: number`
  - `completionScore: number`
  - `createdAt: string`
  - `updatedAt: string`

---

## Page-by-Page Input Requirements

### `/auth/signup`
Form fields:
- Email (email)
- Username (text, max 100)
- Password (password, min 8)
- Role (select: STUDENT, INSTRUCTOR, ADMIN)

### `/auth/login`
Form fields:
- Email (email)
- Password (password)

### `/auth/verify-email`
Form fields:
- Token (text)

### `/auth/forgot-password`
Form fields:
- Email (email)

### `/auth/reset-password`
Form fields:
- Token (text)
- New password (password, min 8)

### `/app/workspace` interactions
- Create folder: name (text), optional parentId (hidden/internal)
- Rename folder: name (text)
- Upload file: fileType (select), folderId (selected folder), originalName, contentType, mock file content
- Update file metadata: isShareable (toggle)
- Share folder/file: sharedWithUserId (text)
- Chat composer:
  - content (textarea)
  - aiModelId (select)
  - optional file attach (mock)

### `/app/profile/edit`
Form fields:
- First name (text, max 100)
- Last name (text, max 100)
- University ID (text, max 50)
- Department (text, max 100)
- Bio (textarea, max 2000)
- Profile image file id (text)
- Visibility (select: PUBLIC, UNIVERSITY_ONLY, PRIVATE)

---

## Mock Services To Include

Create mock async service modules with Promise-based APIs and artificial delay:
- `authMockService`
  - signup, login, verifyEmail, forgotPassword, resetPassword, refresh, logout
- `fileMockService`
  - createFolder, updateFolder, deleteFolder
  - listMyFolders, listSharedFolders
  - uploadFile, getFileMetadata, updateFileMetadata, deleteFile
  - listMyFiles, listSharedWithMe
  - shareFile, unshareFile, shareFolder, unshareFolder
- `chatMockService`
  - sendMessage, listChatrooms, getChatroom, listMessages, setTyping
- `profileMockService`
  - getMyProfile, getProfileById, updateMyProfile, searchProfiles, updateVisibility

Use in-memory arrays/maps and deterministic IDs.

---

## Suggested Folder Structure

Use this as baseline:

- `src/app/(public)/page.tsx`
- `src/app/(public)/auth/login/page.tsx`
- `src/app/(public)/auth/signup/page.tsx`
- `src/app/(public)/auth/verify-email/page.tsx`
- `src/app/(public)/auth/forgot-password/page.tsx`
- `src/app/(public)/auth/reset-password/page.tsx`
- `src/app/(protected)/app/layout.tsx`
- `src/app/(protected)/app/page.tsx`
- `src/app/(protected)/app/workspace/page.tsx`
- `src/app/(protected)/app/workspace/[folderId]/page.tsx`
- `src/app/(protected)/app/workspace/[folderId]/[fileId]/page.tsx`
- `src/app/(protected)/app/profile/page.tsx`
- `src/app/(protected)/app/profile/edit/page.tsx`
- `src/app/(protected)/app/settings/page.tsx`
- `src/features/auth/*`
- `src/features/workspace/*`
- `src/features/pdf-viewer/*`
- `src/features/chat/*`
- `src/features/profile/*`
- `src/lib/mocks/*`
- `src/lib/types/*`
- `src/lib/utils/*`

---

## UI Style Direction (Futuristic + NotebookLM Inspired)

- Clean, minimal, high-contrast, modern productivity look
- Soft futuristic visual treatment (subtle glow, layered surfaces)
- Emphasize clarity over decoration
- Strong typography hierarchy and spacing rhythm
- Smooth hover/focus transitions (not excessive)
- Keep accessibility in mind (keyboard focus, contrast, semantics)

Do not over-design. Keep it practical and modular.

---

## State and UX Expectations

- Include mock auth state provider/store and route guarding behavior
- Preserve selected folder/file/chatroom state in URL when applicable
- Include optimistic-feeling UX for local mock actions
- Include empty states for:
  - no folders
  - no files in folder
  - no chat messages
  - no profile data
- Include inline validation errors for all forms

---

## Deliverable Quality Bar

Generate a **working skeleton** with:
- All required routes and page shells
- Reusable components wired together
- Mock data end-to-end for all visible UI flows
- No backend calls
- Clean TypeScript types and feature-based organization

This is a foundation for future backend integration and real-time features, so prioritize maintainability and modularity.
