import {
  AIModel,
  ChatMessage,
  AIStreamEventType,
  ChatRealtimeEvent,
  Chatroom,
  ListChatroomsResponse,
  ListMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  UpsertUserAiApiKeyInput,
  UserAiApiKeyResponse,
} from '@/src/lib/types';
import { apiRequest, API_BASE_URL } from '@/src/lib/api/gateway-core';
import { sendMessageSchema } from './gateway-schemas';
import { fetchEventSource } from '@microsoft/fetch-event-source';

async function chatRequest<T>(
  endpoint: string,
  token: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
  },
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: options?.method ?? 'GET',
    token,
    body: options?.body,
    cache: 'no-store',
  });
}

export interface OpenChatSocketOptions {
  accessToken: string;
  chatroomId?: string;
  onMessage: (event: ChatRealtimeEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
}

export interface StreamAiResponseOptions {
  token: string;
  messageId: string;
  chatroomId: string;
  signal?: AbortSignal;
  correlationId?: string;
  onChunk: (payload: { messageId: string; contentDelta: string; sequence?: number; done?: boolean }) => void;
  onCompleted: (payload: { messageId: string; finalContent?: string; done?: boolean }) => void;
  onFailed: (payload: { messageId: string; error: string }) => void;
  onCancelled: (payload: { messageId: string }) => void;
}

interface StreamEnvelope {
  type: AIStreamEventType;
  data: {
    messageId?: string;
    sequence?: number;
    contentDelta?: string;
    finalContent?: string;
    done?: boolean;
    error?: string;
  };
}

export function resolveGatewayWsBase(): string {
  const httpBase = API_BASE_URL.replace(/\/api\/internal\/?$/i, '');
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
    const res = await chatRequest<ListChatroomsResponse>(`chat/chatrooms?page=${page}&size=${size}`, token);
    return res.chatrooms;
  },

  getChatroom: (token: string, chatroomId: string) =>
    chatRequest<Chatroom>(`chat/chatrooms/${chatroomId}`, token),

  async listMessages(token: string, chatroomId: string, page = 0, size = 50): Promise<ChatMessage[]> {
    const res = await chatRequest<ListMessagesResponse>(`chat/chatrooms/${chatroomId}/messages?page=${page}&size=${size}`, token);
    return res.messages;
  },

  sendMessage: (token: string, input: SendMessageRequest) =>
    chatRequest<SendMessageResponse>('chat/messages', token, {
      method: 'POST',
      body: sendMessageSchema.parse(input),
    }),

  setTyping: (token: string, chatroomId: string, isTyping = true) =>
    chatRequest<{ message: string }>(`chat/chatrooms/${chatroomId}/typing?isTyping=${isTyping}`, token, {
      method: 'POST',
    }),

  cancelAiMessage: (token: string, messageId: string) =>
    chatRequest<{ message: string }>(`chat/messages/${messageId}/cancel`, token, {
      method: 'POST',
    }),

  async streamAiResponse(options: StreamAiResponseOptions): Promise<void> {
    const streamUrl = `${API_BASE_URL}/chat/messages/${encodeURIComponent(options.messageId)}/stream?chatroomId=${encodeURIComponent(options.chatroomId)}`;
    let accumulated = '';

    await fetchEventSource(streamUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${options.token}`,
        Accept: 'text/event-stream',
        ...(options.correlationId ? { 'X-Correlation-ID': options.correlationId } : {}),
      },
      signal: options.signal,
      onmessage(event) {
        if (!event.data) return;

        let envelope: any;
        try {
          envelope = JSON.parse(event.data);
        } catch {
          return;
        }

        const eventType = envelope.event_type || envelope.type;
        const payload = envelope.payload || envelope.data || {};
        const resolvedMessageId = envelope.message_id || payload.messageId || options.messageId;

        if (eventType === 'chunk' || eventType === 'AI_CHUNK') {
          const delta = payload.content_delta ?? payload.contentDelta ?? '';
          accumulated += delta;
          options.onChunk({
            messageId: resolvedMessageId,
            contentDelta: delta,
            sequence: envelope.sequence || payload.sequence,
            done: payload.done,
          });
          return;
        }

        if (eventType === 'final' || eventType === 'AI_COMPLETED') {
          options.onCompleted({
            messageId: resolvedMessageId,
            finalContent: payload.final_content ?? payload.finalContent ?? accumulated,
            done: true,
          });
          return;
        }

        if (eventType === 'error' || eventType === 'AI_FAILED') {
          options.onFailed({
            messageId: resolvedMessageId,
            error: payload.error_message ?? payload.error ?? 'AI generation failed',
          });
          return;
        }

        if (eventType === 'cancelled' || eventType === 'AI_CANCELLED') {
          options.onCancelled({
            messageId: resolvedMessageId,
          });
        }
      },
      onerror(error) {
        throw error;
      },
    });
  },

  async listAiModels(token: string): Promise<AIModel[]> {
    const candidateEndpoints = ['ai/models'];

    const normalizeModel = (input: Record<string, unknown>): AIModel | null => {
      const modelId = typeof input.model_id === 'string'
        ? input.model_id
        : typeof input.modelId === 'string'
          ? input.modelId
          : typeof input.id === 'string'
            ? input.id
            : null;

      const modelName = typeof input.model_name === 'string'
        ? input.model_name
        : typeof input.modelName === 'string'
          ? input.modelName
          : typeof input.name === 'string'
            ? input.name
            : null;

      if (!modelId || !modelName) {
        return null;
      }

      const provider = typeof input.provider === 'string' ? input.provider : 'unknown';
      const contextLengthRaw = input.context_length ?? input.contextLength;
      const contextLength = typeof contextLengthRaw === 'number' ? contextLengthRaw : 0;
      const supportsStreamingRaw = input.supports_streaming ?? input.supportsStreaming;
      const supportsStreaming = typeof supportsStreamingRaw === 'boolean' ? supportsStreamingRaw : false;
      const userKeyConfiguredRaw = input.user_key_configured ?? input.userKeyConfigured;
      const userKeyConfigured = typeof userKeyConfiguredRaw === 'boolean' ? userKeyConfiguredRaw : false;
      const platformKeyAvailableRaw = input.platform_key_available ?? input.platformKeyAvailable;
      const activeRaw = input.active;

      return {
        modelId,
        modelName,
        id: modelId,
        name: modelName,
        provider,
        description: typeof input.description === 'string' ? input.description : undefined,
        contextLength,
        supportsStreaming,
        userKeyConfigured,
        platformKeyAvailable: typeof platformKeyAvailableRaw === 'boolean' ? platformKeyAvailableRaw : undefined,
        active: typeof activeRaw === 'boolean' ? activeRaw : undefined,
      };
    };

    const normalizeModels = (payload: unknown): AIModel[] => {
      const rows = Array.isArray(payload)
        ? payload
        : payload && typeof payload === 'object' && Array.isArray((payload as { models?: unknown[] }).models)
          ? (payload as { models: unknown[] }).models
          : [];

      return rows
        .map((row) => (row && typeof row === 'object' ? normalizeModel(row as Record<string, unknown>) : null))
        .filter((row): row is AIModel => Boolean(row));
    };

    for (const endpoint of candidateEndpoints) {
      try {
        const response = await chatRequest<unknown>(endpoint, token);
        const normalized = normalizeModels(response);
        if (normalized.length > 0) return normalized;
      } catch {
        // try next candidate endpoint
      }
    }

    return [];
  },

  async createUserApiKey(token: string, input: UpsertUserAiApiKeyInput): Promise<UserAiApiKeyResponse> {
    const candidateEndpoints = ['ai/api-keys'];

    for (const endpoint of candidateEndpoints) {
      try {
        return await chatRequest<UserAiApiKeyResponse>(endpoint, token, {
          method: 'POST',
          body: {
            model_id: input.modelId,
            api_key: input.apiKey,
          },
        });
      } catch {
        // try next candidate endpoint
      }
    }

    throw new Error('Failed to save AI API key');
  },

  async updateUserApiKey(token: string, input: UpsertUserAiApiKeyInput): Promise<UserAiApiKeyResponse> {
    const candidateEndpoints = ['ai/api-keys'];

    for (const endpoint of candidateEndpoints) {
      try {
        return await chatRequest<UserAiApiKeyResponse>(endpoint, token, {
          method: 'PUT',
          body: {
            model_id: input.modelId,
            api_key: input.apiKey,
          },
        });
      } catch {
        // try next candidate endpoint
      }
    }

    throw new Error('Failed to update AI API key');
  },

  async deleteUserApiKey(token: string, modelId: string): Promise<void> {
    const candidateEndpoints = [`ai/api-keys/${modelId}`, `ai/models/${modelId}/api-keys`];

    for (const endpoint of candidateEndpoints) {
      try {
        await chatRequest<void>(endpoint, token, { method: 'DELETE' });
        return;
      } catch {
        // try next
      }
    }
    throw new Error('Failed to delete AI API key');
  },

  async createAiModel(token: string, input: { modelName: string; provider: string; contextLength?: number; description?: string }): Promise<AIModel> {
    return await chatRequest<AIModel>('ai/models', token, {
      method: 'POST',
      body: {
        model_name: input.modelName,
        provider: input.provider,
        context_length: input.contextLength || 8192,
        description: input.description,
      },
    });
  },

  async upsertPlatformApiKey(token: string, input: { provider: string; apiKey: string }): Promise<void> {
    await chatRequest<void>('ai/platform-keys', token, {
      method: 'POST',
      body: {
        provider: input.provider,
        api_key: input.apiKey,
      },
    });
  },

  async streamAiExecution(options: {
    token: string;
    requestId: string;
    signal?: AbortSignal;
    onChunk: (payload: { requestId: string; contentDelta: string; sequence?: number; done?: boolean }) => void;
    onStage?: (payload: { requestId: string; stageName: string; stageStatus: string }) => void;
    onCompleted: (payload: { requestId: string; finalContent?: string; done?: boolean }) => void;
    onFailed: (payload: { requestId: string; error: string }) => void;
    onCancelled: (payload: { requestId: string }) => void;
  }): Promise<void> {
    const streamUrl = `${API_BASE_URL}/ai/executions/${encodeURIComponent(options.requestId)}/stream`;
    let accumulated = '';

    await fetchEventSource(streamUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${options.token}`,
        Accept: 'text/event-stream',
      },
      signal: options.signal,
      onmessage(event) {
        if (!event.data) return;

        try {
          const envelope = JSON.parse(event.data);
          const eventType = envelope.event_type || envelope.type;
          const requestId = envelope.request_id || options.requestId;
          const payload = envelope.payload || envelope.data || {};

          if (eventType === 'chunk' || eventType === 'AI_CHUNK') {
            const delta = payload.content_delta ?? payload.contentDelta ?? '';
            accumulated += delta;
            options.onChunk({
              requestId,
              contentDelta: delta,
              sequence: envelope.sequence,
              done: payload.done,
            });
            return;
          }

          if (eventType === 'stage') {
            options.onStage?.({
              requestId,
              stageName: payload.stage_name ?? '',
              stageStatus: payload.stage_status ?? '',
            });
            return;
          }

          if (eventType === 'final' || eventType === 'AI_COMPLETED') {
            options.onCompleted({
              requestId,
              finalContent: payload.final_content ?? payload.finalContent ?? accumulated,
              done: true,
            });
            return;
          }

          if (eventType === 'error' || eventType === 'AI_FAILED') {
            options.onFailed({
              requestId,
              error: payload.error_message ?? payload.error ?? 'AI generation failed',
            });
            return;
          }

          if (eventType === 'cancelled' || eventType === 'AI_CANCELLED') {
            options.onCancelled({
              requestId,
            });
          }
        } catch {
          // ignore parsing errors
        }
      },
      onerror(error) {
        throw error;
      },
    });
  },

  startAiExecution: (token: string, input: {
    requestId?: string;
    prompt: string;
    mode?: 'chat' | 'deep' | string;
    aiModelId?: string;
    fileIds?: string[];
    chatroomId?: string;
    messageId?: string;
    options?: Record<string, string>;
  }) =>
    chatRequest<{ status: string; requestId: string; streamKey: string; accepted: boolean }>('ai/executions', token, {
      method: 'POST',
      body: input,
    }),
};

