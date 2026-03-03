# Developer Guide: Extending NotebookLM

This guide helps developers extend and customize the NotebookLM platform skeleton.

## Architecture Overview

### Layered Architecture
```
UI Layer (components/)
  ↓
Feature Layer (features/)
  ↓
State Layer (contexts/)
  ↓
Service Layer (lib/mocks/)
  ↓
Type Layer (lib/types/)
```

### Data Flow
```
User Action → Component Hook → Context Update → Service Call → UI Re-render
```

---

## Adding a New Feature

### Example: Add a "Favorites" Feature

#### Step 1: Define Types
**File:** `src/lib/types/favorites.ts`
```ts
export interface Favorite {
  id: string;
  userId: string;
  fileId: string;
  createdAt: string;
}

export interface AddFavoriteRequest {
  fileId: string;
}
```

Add to `src/lib/types/index.ts`:
```ts
export * from './favorites';
```

#### Step 2: Create Mock Service
**File:** `src/lib/mocks/favorites-mock-service.ts`
```ts
import { Favorite, AddFavoriteRequest } from '@/lib/types';

const favorites = new Map<string, Favorite[]>();

export const favoritesMockService = {
  async addFavorite(userId: string, request: AddFavoriteRequest): Promise<Favorite> {
    await delay(300);
    
    const favorite: Favorite = {
      id: `fav-${Date.now()}`,
      userId,
      fileId: request.fileId,
      createdAt: new Date().toISOString(),
    };
    
    const userFavorites = favorites.get(userId) || [];
    userFavorites.push(favorite);
    favorites.set(userId, userFavorites);
    
    return favorite;
  },
  
  async removeFavorite(userId: string, fileId: string): Promise<void> {
    await delay(300);
    const userFavorites = favorites.get(userId) || [];
    favorites.set(
      userId,
      userFavorites.filter((f) => f.fileId !== fileId)
    );
  },
  
  async listFavorites(userId: string): Promise<Favorite[]> {
    await delay(300);
    return favorites.get(userId) || [];
  },
};
```

Add to `src/lib/mocks/index.ts`:
```ts
export { favoritesMockService } from './favorites-mock-service';
```

#### Step 3: Create Component
**File:** `src/features/favorites/favorite-button.tsx`
```ts
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { favoritesMockService } from '@/lib/mocks';
import { useAuth } from '@/contexts/auth-context';

interface FavoriteButtonProps {
  fileId: string;
  isFavorited?: boolean;
}

export function FavoriteButton({ fileId, isFavorited = false }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(isFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      if (favorited) {
        await favoritesMockService.removeFavorite(user.id, fileId);
        setFavorited(false);
      } else {
        await favoritesMockService.addFavorite(user.id, { fileId });
        setFavorited(true);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
    >
      {favorited ? '⭐' : '☆'}
    </Button>
  );
}
```

#### Step 4: Use in Existing Component
**File:** `src/features/pdf-viewer/pdf-toolbar.tsx`
```ts
import { FavoriteButton } from '@/features/favorites/favorite-button';

export function PdfToolbar({ file }: PdfToolbarProps) {
  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-4">
      {/* ... existing code ... */}
      <div className="flex items-center gap-2">
        <FavoriteButton fileId={file.id} />
        {/* ... other buttons ... */}
      </div>
    </div>
  );
}
```

---

## Replacing Mock Services with Real APIs

### Step 1: Keep Types Unchanged
Types remain the same - they define the contract between frontend and backend.

### Step 2: Create API Client
**File:** `src/lib/api/files-api.ts`
```ts
import { Folder, FileItem, CreateFolderRequest } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const filesApi = {
  async createFolder(userId: string, request: CreateFolderRequest): Promise<Folder> {
    const response = await fetch(`${API_BASE}/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  },

  async listMyFolders(userId: string): Promise<Folder[]> {
    const response = await fetch(`${API_BASE}/folders?userId=${userId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  },

  // ... other methods following same pattern
};

function getToken(): string {
  // Get from localStorage, context, or cookie
  return localStorage.getItem('authToken') || '';
}
```

### Step 3: Update Components
**Before:**
```ts
import { fileMockService } from '@/lib/mocks';
const folders = await fileMockService.listMyFolders(user.id);
```

**After:**
```ts
import { filesApi } from '@/lib/api';
const folders = await filesApi.listMyFolders(user.id);
```

No component logic changes - just swap the service!

---

## Adding Real Authentication

### Step 1: Update Auth Context
**File:** `src/contexts/auth-context.tsx`
```ts
// Before: Mock service
import { authMockService } from '@/lib/mocks';

// After: Real API
import { authApi } from '@/lib/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Swapped: authApi instead of authMockService
      const result = await authApi.login({ email, password });
      
      // Store token
      localStorage.setItem('authToken', result.accessToken);
      
      setSession(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // ... rest of context
}
```

### Step 2: Initialize Session on Mount
**File:** `src/app/layout.tsx`
```ts
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

export function AuthProvider({ children }: Props) {
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Refresh token to get current user
          const session = await authApi.refresh(token);
          setSession(session);
        } catch (err) {
          localStorage.removeItem('authToken');
        }
      }
    };

    initializeAuth();
  }, []);

  // ... rest of provider
}
```

---

## Working with SWR for Data Fetching

### Install SWR
```bash
pnpm add swr
```

### Example: Fetch Folders with SWR
**File:** `src/features/workspace/components/left-sidebar.tsx`
```ts
'use client';

import useSWR from 'swr';
import { fileMockService } from '@/lib/mocks';
import { useAuth } from '@/contexts/auth-context';

export function LeftSidebar({ isOpen }: LeftSidebarProps) {
  const { user } = useAuth();

  // SWR hook for data fetching and caching
  const { data: folders, error, isLoading } = useSWR(
    user?.id ? [`/folders/${user.id}`, user.id] : null,
    async ([_, userId]) => {
      // Can be mock or real API - same interface!
      return fileMockService.listMyFolders(userId);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  if (isLoading) return <LoadingState text="Loading folders..." />;
  if (error) return <ErrorState message="Failed to load folders" />;

  return (
    <aside className="...">
      {/* Use folders data - same as before! */}
    </aside>
  );
}
```

---

## Adding Database Models

### Example: Database Schema (PostgreSQL)
```sql
-- Users (handled by auth system)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  username VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Folders
CREATE TABLE folders (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR NOT NULL,
  parent_id UUID REFERENCES folders(id),
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Files
CREATE TABLE files (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  folder_id UUID NOT NULL REFERENCES folders(id),
  file_type VARCHAR NOT NULL,
  original_name VARCHAR NOT NULL,
  stored_name VARCHAR NOT NULL,
  content_type VARCHAR NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path VARCHAR NOT NULL,
  is_shareable BOOLEAN DEFAULT false,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  chatroom_id UUID NOT NULL,
  sender_user_id UUID NOT NULL REFERENCES users(id),
  ai_model_id VARCHAR,
  content TEXT NOT NULL,
  file_id UUID REFERENCES files(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Profiles
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  university_id VARCHAR,
  department VARCHAR,
  bio TEXT,
  profile_image_file_id UUID REFERENCES files(id),
  visibility VARCHAR DEFAULT 'PRIVATE',
  reputation_score INTEGER DEFAULT 0,
  completion_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Performance Optimization

### 1. Image Optimization
```ts
import Image from 'next/image';

<Image
  src="/profile.jpg"
  alt="Profile"
  width={200}
  height={200}
  priority={true}
/>
```

### 2. Code Splitting
```ts
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('./pdf-viewer'), {
  loading: () => <LoadingState />,
});
```

### 3. Caching Strategy
```ts
// Cache folder list for 5 minutes
const { data } = useSWR(
  ['/folders', userId],
  fetcher,
  {
    dedupingInterval: 300000, // 5 minutes
    focusThrottleInterval: 600000,
  }
);
```

---

## Testing Components

### Example: Test FavoriteButton
**File:** `src/features/favorites/__tests__/favorite-button.test.tsx`
```ts
import { render, screen, fireEvent } from '@testing-library/react';
import { FavoriteButton } from '../favorite-button';
import { AuthProvider } from '@/contexts/auth-context';

describe('FavoriteButton', () => {
  it('toggles favorite state on click', async () => {
    render(
      <AuthProvider>
        <FavoriteButton fileId="file-1" />
      </AuthProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('☆');

    fireEvent.click(button);
    
    // Wait for async operation
    await screen.findByText('⭐');
  });
});
```

---

## Environment Variables

### For Development (Mock)
```env
# Use mock services (default)
NEXT_PUBLIC_API_URL=
```

### For Staging/Production
```env
NEXT_PUBLIC_API_URL=https://api.notebooklm.com
NEXT_PUBLIC_AUTH0_DOMAIN=auth.notebooklm.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

---

## Common Patterns

### Loading States
```ts
const [isLoading, setIsLoading] = useState(false);

try {
  setIsLoading(true);
  await service.doSomething();
} finally {
  setIsLoading(false);
}
```

### Error Handling
```ts
const [error, setError] = useState<string | null>(null);

try {
  setError(null);
  await service.doSomething();
} catch (err) {
  setError(err instanceof Error ? err.message : 'Unknown error');
}
```

### Optimistic Updates
```ts
// Update UI immediately
setData(prev => [...prev, newItem]);

// Then sync with backend
try {
  await api.create(newItem);
} catch (err) {
  // Revert on error
  setData(prev => prev.filter(item => item.id !== newItem.id));
}
```

---

## Debugging Tips

### Enable Console Logging
```ts
// In mock services or API calls
console.log('[API]', 'Fetching folders for user:', userId);
```

### Debug Context Values
```ts
const value = useAuth();
console.log('[Auth Context]', value);
```

### React DevTools
- Install React DevTools browser extension
- Inspect component props and state
- View context values in real-time

---

## Deployment

### Build for Production
```bash
pnpm run build
pnpm start
```

### Environment Setup
```bash
# Copy .env.example to .env.local
cp .env.example .env.local

# Fill in production values
NEXT_PUBLIC_API_URL=https://api.production.com
```

### Deploy to Vercel
```bash
# Install Vercel CLI
pnpm install -g vercel

# Deploy
vercel
```

---

## Troubleshooting

### "Module not found" errors
- Check import paths (use absolute paths: `@/`)
- Verify file exists in correct directory
- Restart dev server

### TypeScript errors
- Run `pnpm tsc --noEmit` to check
- Check `tsconfig.json` paths configuration
- Ensure all exports are in index.ts files

### Async issues
- Check that components using async are wrapped in `useEffect`
- Verify mock services resolve correctly
- Check browser console for errors

---

## Resources

- [Next.js 16 Docs](https://nextjs.org)
- [React 19 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

---

**Happy developing!** 🚀
