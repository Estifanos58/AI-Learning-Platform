import {
  AIModel,
  ChatMessage,
  ChatRealtimeEvent,
  Chatroom,
  ListChatroomsResponse,
  ListMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
} from '@/src/lib/types';
import { sendMessageSchema } from './gateway-schemas';

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function resolveGatewayHttpBase(): string {
  const explicitGatewayBase = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL;
  if (explicitGatewayBase) {
    return trimTrailingSlash(explicitGatewayBase);
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (apiBase) {
    try {
      const url = new URL(trimTrailingSlash(apiBase));
      return `${url.protocol}//${url.host}`;
    } catch {
      return trimTrailingSlash(apiBase).replace(/\/api(?:\/.*)?$/i, '');
    }
  }

  return 'http://localhost:8081';
}

function buildAuthHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Correlation-ID':
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `corr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    if (contentType.includes('application/json')) {
      try {
        const payload = await response.json();
        if (payload && typeof payload.message === 'string') {
          message = payload.message;
        }
      } catch {
        // ignore
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return undefined as T;
}

async function chatRequest<T>(
  endpoint: string,
  token: string,
  options?: {
    method?: 'GET' | 'POST';
    body?: unknown;
  },
): Promise<T> {
  const response = await fetch(`${resolveGatewayHttpBase()}${endpoint}`, {
    method: options?.method ?? 'GET',
    headers: {
      ...buildAuthHeaders(token),
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  return parseJsonResponse<T>(response);
}

export interface OpenChatSocketOptions {
  accessToken: string;
  chatroomId?: string;
  onMessage: (event: ChatRealtimeEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
}

export function resolveGatewayWsBase(): string {
  const httpBase = resolveGatewayHttpBase();
  if (httpBase.startsWith('https://')) {
    return `wss://${httpBase.slice('https://'.length)}`;
  }
  if (httpBase.startsWith('http://')) {
    return `ws://${httpBase.slice('http://'.length)}`;
  }
  return httpBase;
}

export function openChatSocket(options: OpenChatSocketOptions): WebSocket {
  const params = new URLSearchParams({ token: options.accessToken });
  if (options.chatroomId) {
    params.set('chatroomId', options.chatroomId);
  }

  const socket = new WebSocket(`${resolveGatewayWsBase()}/ws/chat?${params.toString()}`);

  socket.onopen = () => {
    options.onOpen?.();
  };

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as ChatRealtimeEvent;
      options.onMessage(parsed);
    } catch {
      // ignore invalid payloads
    }
  };

  socket.onerror = (event) => {
    options.onError?.(event);
  };

  socket.onclose = (event) => {
    options.onClose?.(event);
  };

  return socket;
}

export const chatApi = {
  async listChatrooms(token: string, page = 0, size = 20): Promise<Chatroom[]> {
    const res = await chatRequest<ListChatroomsResponse>(`/api/chat/chatrooms?page=${page}&size=${size}`, token);
    return res.chatrooms;
  },

  getChatroom: (token: string, chatroomId: string) =>
    chatRequest<Chatroom>(`/api/chat/chatrooms/${chatroomId}`, token),

  async listMessages(token: string, chatroomId: string, page = 0, size = 50): Promise<ChatMessage[]> {
    const res = await chatRequest<ListMessagesResponse>(`/api/chat/chatrooms/${chatroomId}/messages?page=${page}&size=${size}`, token);
    return res.messages;
  },

  sendMessage: (token: string, input: SendMessageRequest) =>
    chatRequest<SendMessageResponse>('/api/chat/messages', token, {
      method: 'POST',
      body: sendMessageSchema.parse(input),
    }),

  setTyping: (token: string, chatroomId: string, isTyping = true) =>
    chatRequest<{ message: string }>(`/api/chat/chatrooms/${chatroomId}/typing?isTyping=${isTyping}`, token, {
      method: 'POST',
    }),

  cancelAiMessage: (token: string, messageId: string) =>
    chatRequest<{ message: string }>(`/api/chat/messages/${messageId}/cancel`, token, {
      method: 'POST',
    }),

  async listAiModels(token: string): Promise<AIModel[]> {
    const candidateEndpoints = ['/api/chat/ai-models', '/api/chat/models'];

    for (const endpoint of candidateEndpoints) {
      try {
        const response = await chatRequest<{ models?: AIModel[] } | AIModel[]>(endpoint, token);
        if (Array.isArray(response)) {
          return response;
        }
        if (Array.isArray(response.models)) {
          return response.models;
        }
      } catch {
        // try next candidate endpoint
      }
    }

    return [];
  },
};
