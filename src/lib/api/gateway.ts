import { z } from 'zod';
import {
  AuthSession,
  ChatMessage,
  Chatroom,
  FileItem,
  Folder,
  ProfileVisibility,
  Role,
  UserProfile,
} from '@/src/lib/types';
import { authMockService, chatMockService, fileMockService, profileMockService } from '@/src/lib/mocks';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:8081';

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  code: string;
  message: string;
  path: string;
  correlationId: string;
  details?: Record<string, string>;
}

export class GatewayApiError extends Error {
  status: number;
  code: string;
  correlationId?: string;
  details?: Record<string, string>;

  constructor(payload: Partial<ApiErrorResponse> & { message: string }) {
    super(payload.message);
    this.name = 'GatewayApiError';
    this.status = payload.status ?? 500;
    this.code = payload.code ?? 'INTERNAL_ERROR';
    this.correlationId = payload.correlationId;
    this.details = payload.details;
  }
}

const emailSchema = z.string().trim().email('Please enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long');
const usernameSchema = z
  .string()
  .trim()
  .min(1, 'Username is required')
  .max(100, 'Username must be 100 characters or less');
const roleSchema = z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']);

const signupSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  role: roleSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, 'Verification token is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});

const updateProfileSchema = z
  .object({
    firstName: z.string().max(100, 'First name must be 100 characters or less').optional(),
    lastName: z.string().max(100, 'Last name must be 100 characters or less').optional(),
    universityId: z.string().max(50, 'University ID must be 50 characters or less').optional(),
    department: z.string().max(100, 'Department must be 100 characters or less').optional(),
    bio: z.string().max(2000, 'Bio must be 2000 characters or less').optional(),
    profileImageFileId: z.string().optional(),
  })
  .strict();

const createFolderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name is required'),
  parentId: z.string().optional(),
});

const updateFolderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name is required'),
});

const uploadFileSchema = z.object({
  fileType: z.enum(['PROFILE_IMAGE', 'DOCUMENT']),
  folderId: z.string().trim().min(1, 'Folder is required'),
  originalName: z.string().trim().min(1, 'File name is required'),
  contentType: z.string().trim().optional(),
  contentBase64: z.string().trim().min(1, 'File content is required'),
  isShareable: z.boolean().optional(),
});

const sendMessageSchema = z
  .object({
    otherUserId: z.string().optional(),
    chatroomId: z.string().optional(),
    aiModelId: z.string().optional(),
    content: z.string().optional(),
    fileId: z.string().optional(),
    fileBase64: z.string().optional(),
    fileOriginalName: z.string().optional(),
    fileContentType: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.content && !val.fileId && !val.fileBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Message content or file is required',
      });
    }
  });

function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mapErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof GatewayApiError) return error.message;
  if (error instanceof z.ZodError) return error.issues[0]?.message || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

function parseApiError(raw: any, fallbackStatus: number): GatewayApiError {
  if (!raw || typeof raw !== 'object') {
    return new GatewayApiError({
      status: fallbackStatus,
      code: fallbackStatus >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
      message: 'Unexpected server response',
    });
  }

  return new GatewayApiError({
    status: typeof raw.status === 'number' ? raw.status : fallbackStatus,
    code: typeof raw.code === 'string' ? raw.code : 'BAD_REQUEST',
    message: typeof raw.message === 'string' ? raw.message : 'Request failed',
    correlationId: typeof raw.correlationId === 'string' ? raw.correlationId : undefined,
    details: typeof raw.details === 'object' ? raw.details : undefined,
  });
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string;
  body?: unknown;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  signal?: AbortSignal;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body, cache = 'no-store', next, signal } = options;
  const correlationId = createCorrelationId();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'X-Correlation-ID': correlationId,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache,
    next,
    signal,
  });

  if (!response.ok) {
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw parseApiError(payload, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export const gatewayApi = {
  auth: {
    async signup(input: { email: string; username: string; password: string; role: Role }): Promise<AuthSession> {
      const payload = signupSchema.parse(input);
      try {
        const res = await apiRequest<{ message: string } & AuthSession>('/api/auth/signup', {
          method: 'POST',
          body: payload,
          cache: 'no-store',
        });
        return {
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          tokenType: res.tokenType,
          accessTokenExpiresInSeconds: res.accessTokenExpiresInSeconds,
          user: res.user,
        };
      } catch (error) {
        throw new Error(mapErrorMessage(error, 'Signup failed'));
      }
    },

    async login(input: { email: string; password: string }): Promise<AuthSession> {
      const payload = loginSchema.parse(input);
      try {
        const res = await apiRequest<{ message: string } & AuthSession>('/api/auth/login', {
          method: 'POST',
          body: payload,
          cache: 'no-store',
        });
        return {
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          tokenType: res.tokenType,
          accessTokenExpiresInSeconds: res.accessTokenExpiresInSeconds,
          user: res.user,
        };
      } catch (error) {
        throw new Error(mapErrorMessage(error, 'Login failed'));
      }
    },

    async verifyEmail(input: { token: string }): Promise<{ message: string }> {
      const payload = verifyEmailSchema.parse(input);
      try {
        return await apiRequest<{ message: string }>('/api/auth/verify-email', {
          method: 'POST',
          body: payload,
          cache: 'no-store',
        });
      } catch (error) {
        throw new Error(mapErrorMessage(error, 'Email verification failed'));
      }
    },

    async refresh(input: { refreshToken: string }): Promise<AuthSession> {
      const payload = refreshSchema.parse(input);
      const res = await apiRequest<{ message: string } & AuthSession>('/api/auth/refresh', {
        method: 'POST',
        body: payload,
        cache: 'no-store',
      });
      return {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        tokenType: res.tokenType,
        accessTokenExpiresInSeconds: res.accessTokenExpiresInSeconds,
        user: res.user,
      };
    },

    async logout(refreshToken: string): Promise<void> {
      const payload = refreshSchema.parse({ refreshToken });
      await apiRequest<{ message: string }>('/api/auth/logout', {
        method: 'POST',
        body: payload,
        cache: 'no-store',
      });
    },

    async forgotPassword(input: { email: string }): Promise<{ message: string }> {
      return authMockService.forgotPassword(input);
    },

    async resetPassword(input: { token: string; newPassword: string }): Promise<{ message: string }> {
      return authMockService.resetPassword(input);
    },
  },

  profile: {
    async getMe(token: string, options?: { revalidateSeconds?: number }): Promise<UserProfile> {
      const next = options?.revalidateSeconds
        ? { revalidate: options.revalidateSeconds, tags: ['profile-me'] }
        : undefined;
      return apiRequest<UserProfile>('/api/profile/me', { token, cache: 'force-cache', next });
    },

    async updateMe(token: string, input: {
      firstName?: string;
      lastName?: string;
      universityId?: string;
      department?: string;
      bio?: string;
      profileImageFileId?: string;
    }): Promise<UserProfile> {
      const payload = updateProfileSchema.parse(input);
      return apiRequest<UserProfile>('/api/profile/me', {
        method: 'PUT',
        token,
        body: payload,
        cache: 'no-store',
      });
    },

    async updateVisibility(token: string, visibility: ProfileVisibility): Promise<{ message: string }> {
      return apiRequest<{ message: string }>('/api/profile/visibility', {
        method: 'PATCH',
        token,
        body: { visibility },
        cache: 'no-store',
      });
    },
  },

  files: {
    async listFolders(token: string, page = 0, size = 50): Promise<Folder[]> {
      const res = await apiRequest<{ folders: Folder[]; total: number }>(`/api/files/folders?page=${page}&size=${size}`, {
        token,
        cache: 'force-cache',
        next: { revalidate: 60, tags: ['folders'] },
      });
      return res.folders;
    },

    async listMyFiles(token: string, page = 0, size = 200): Promise<FileItem[]> {
      const res = await apiRequest<{ files: FileItem[]; total: number }>(`/api/files/my?page=${page}&size=${size}`, {
        token,
        cache: 'force-cache',
        next: { revalidate: 60, tags: ['files'] },
      });
      return res.files;
    },

    async createFolder(token: string, input: { name: string; parentId?: string }): Promise<Folder> {
      const payload = createFolderSchema.parse(input);
      return apiRequest<Folder>('/api/files/folders', {
        method: 'POST',
        token,
        body: payload,
        cache: 'no-store',
      });
    },

    async updateFolder(token: string, folderId: string, input: { name: string }): Promise<Folder> {
      const payload = updateFolderSchema.parse(input);
      return apiRequest<Folder>(`/api/files/folders/${folderId}`, {
        method: 'PUT',
        token,
        body: payload,
        cache: 'no-store',
      });
    },

    async deleteFolder(token: string, folderId: string): Promise<{ message: string }> {
      return apiRequest<{ message: string }>(`/api/files/folders/${folderId}`, {
        method: 'DELETE',
        token,
        cache: 'no-store',
      });
    },

    async getFile(token: string, fileId: string): Promise<FileItem> {
      return apiRequest<FileItem>(`/api/files/${fileId}`, {
        token,
        cache: 'force-cache',
        next: { revalidate: 60, tags: ['files', `file-${fileId}`] },
      });
    },

    async deleteFile(token: string, fileId: string): Promise<{ message: string }> {
      return apiRequest<{ message: string }>(`/api/files/${fileId}`, {
        method: 'DELETE',
        token,
        cache: 'no-store',
      });
    },

    async uploadFile(token: string, input: {
      fileType: 'PROFILE_IMAGE' | 'DOCUMENT';
      folderId: string;
      originalName: string;
      contentType?: string;
      contentBase64: string;
      isShareable?: boolean;
    }): Promise<FileItem> {
      const payload = uploadFileSchema.parse(input);
      return apiRequest<FileItem>('/api/files', {
        method: 'POST',
        token,
        body: payload,
        cache: 'no-store',
      });
    },

    async renameFile(token: string, fileId: string, newName: string): Promise<FileItem> {
      return apiRequest<FileItem>(`/api/files/${fileId}/metadata`, {
        method: 'PATCH',
        token,
        body: { originalName: newName },
        cache: 'no-store',
      });
    },
  },

  chat: {
    async listChatrooms(token: string, page = 0, size = 20): Promise<Chatroom[]> {
      const res = await apiRequest<{ chatrooms: Chatroom[]; total: number }>(`/api/chat/chatrooms?page=${page}&size=${size}`, {
        token,
        cache: 'force-cache',
        next: { revalidate: 30, tags: ['chatrooms'] },
      });
      return res.chatrooms;
    },

    async getChatroom(token: string, chatroomId: string): Promise<Chatroom> {
      return apiRequest<Chatroom>(`/api/chat/chatrooms/${chatroomId}`, {
        token,
        cache: 'force-cache',
        next: { revalidate: 30, tags: ['chatrooms', `chatroom-${chatroomId}`] },
      });
    },

    async listMessages(token: string, chatroomId: string, page = 0, size = 50): Promise<ChatMessage[]> {
      const res = await apiRequest<{ messages: ChatMessage[]; total: number }>(
        `/api/chat/chatrooms/${chatroomId}/messages?page=${page}&size=${size}`,
        {
          token,
          cache: 'force-cache',
          next: { revalidate: 15, tags: ['chat-messages', `chatroom-${chatroomId}`] },
        }
      );
      return res.messages;
    },

    async sendMessage(
      token: string,
      input: {
        otherUserId?: string;
        chatroomId?: string;
        aiModelId?: string;
        content?: string;
        fileId?: string;
        fileBase64?: string;
        fileOriginalName?: string;
        fileContentType?: string;
      }
    ): Promise<{ message: ChatMessage; chatroomId: string; isNewChatroom: boolean }> {
      const payload = sendMessageSchema.parse(input);
      return apiRequest<{ message: ChatMessage; chatroomId: string; isNewChatroom: boolean }>('/api/chat/messages', {
        method: 'POST',
        token,
        body: payload,
        cache: 'no-store',
      });
    },

    async setTyping(token: string, chatroomId: string, isTyping = true): Promise<{ message: string }> {
      return apiRequest<{ message: string }>(`/api/chat/chatrooms/${chatroomId}/typing?isTyping=${isTyping}`, {
        method: 'POST',
        token,
        cache: 'no-store',
      });
    },

    async createChatroomForFile(userId: string, fileId: string): Promise<Chatroom> {
      return chatMockService.createChatroomForFile(userId, fileId);
    },

    async getModels() {
      return chatMockService.getAIModels();
    },
  },

  mockFallbacks: {
    auth: authMockService,
    files: fileMockService,
    profile: profileMockService,
    chat: chatMockService,
  },
};

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== 'string') {
        reject(new Error('Failed to read file'));
        return;
      }
      const base64 = value.includes(',') ? value.split(',')[1] : value;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
