# Quick Start Guide

## Run the App

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Flow (30 seconds)

### Option 1: Use Demo Account (Fastest)

1. Click "Sign In" on landing
2. Enter:
   - Email: `demo@example.com`
   - Password: `password123`
3. Click "Sign In"
4. You're in the workspace!

### Option 2: Create New Account

1. Click "Get Started" on landing
2. Fill signup form (role: Student/Instructor/Admin)
3. You'll be redirected to email verification
4. Enter any token (e.g., `verify-123`)
5. Back to login with your new account

## Explore Features

### Workspace
- **Left Panel:** See "My Documents" folder and demo files inside
- **Center:** Click a file to see PDF viewer shell
- **Right Panel:** Type a question to chat with AI

### Profile
- Click your avatar (top-right) → "Profile"
- View reputation and completion scores
- Click "Edit Profile" to update info

### Settings
- Click your avatar → "Settings"
- Basic toggles and preferences (scaffold)

## Key Shortcuts

- **Ctrl+Enter** in chat = Send message
- **Left Arrow Button** = Toggle sidebar
- **Right Arrow Button** = Toggle chat panel
- **Sign Out:** User menu → "Sign Out"

## What's Included?

✅ **Full Auth Flow:**
- Signup with role selection
- Email verification
- Login/logout
- Password reset

✅ **3-Pane Workspace:**
- Folder management (create/select)
- File browser
- PDF viewer shell
- AI chat with model selection

✅ **Profiles & Settings:**
- View profile with stats
- Edit profile info and visibility
- Basic settings scaffold

✅ **Components:**
- 50+ reusable components
- Loading/empty/error states
- Full TypeScript typing
- Feature-based organization

## Mock Services

All operations use **in-memory mock services** with realistic async patterns:

- **Auth:** Login, signup, verify, reset password
- **Files:** Create/manage folders and files
- **Chat:** Send messages, select AI models
- **Profile:** View/edit user info

Each operation has a ~300ms delay for realistic feel.

## File Structure

```
src/
├── app/                 # Routes
├── contexts/            # Auth context
├── features/            # Workspace, PDF, Chat
├── lib/
│   ├── types/          # TypeScript definitions
│   └── mocks/          # Mock services
└── components/         # Reusable UI components
```

## Common Tasks

### Change Demo User
Edit `/src/lib/mocks/auth-mock-service.ts`:
```ts
const mockUsers = new Map([
  ['user-1', { email: 'demo@example.com', ... }]
  // Add more mock users here
]);
```

### Add More Files
Edit `/src/lib/mocks/file-mock-service.ts`:
```ts
const demoFile: FileItem = { ... };
files.set(demoFile.id, demoFile);
```

### Customize Chat Models
Edit `/src/lib/mocks/chat-mock-service.ts`:
```ts
export const AVAILABLE_AI_MODELS: AIModel[] = [
  // Add your AI models here
];
```

## Next Steps

Ready to add a backend? Replace mock services with real API calls:

```ts
// Before: Mock service
const result = await fileMockService.listMyFolders(userId);

// After: Real API
const response = await fetch(`/api/folders?userId=${userId}`);
const result = await response.json();
```

## Need Help?

- Check `/README.md` for full documentation
- Review `/src/lib/types` for data contracts
- Look at `/src/features` for component examples
- Mock services are well-commented

---

**Enjoy exploring the platform!** 🚀
