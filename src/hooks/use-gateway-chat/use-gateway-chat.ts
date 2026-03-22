'use client';

import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { gatewayApi } from '@/src/lib/api/gateway';
import { openChatSocket } from '@/src/lib/api/gateway-chat';
import { ChatMessage, NewChatroomEvent, ChatRealtimeEvent } from '@/src/lib/types';

export interface UseGatewayChatOptions {
  subscribedChatroomIds?: string[];
  onNewChatroom?: (event: NewChatroomEvent) => void;
}

export function useGatewayChat(token?: string | null, chatroomId?: string | null, options?: UseGatewayChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [activeAiRequestMessageId, setActiveAiRequestMessageId] = useState<string | null>(null);

  const userSocketRef = useRef<WebSocket | null>(null);
  const roomSocketsRef = useRef(new Map<string, WebSocket>());
  const userReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomReconnectTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const activeChatroomIdRef = useRef<string | null>(chatroomId ?? null);
  const onNewChatroomRef = useRef<UseGatewayChatOptions['onNewChatroom']>(options?.onNewChatroom);
  const activeAiAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeChatroomIdRef.current = chatroomId ?? null;
  }, [chatroomId]);

  useEffect(() => {
    onNewChatroomRef.current = options?.onNewChatroom;
  }, [options?.onNewChatroom]);

  const subscribedChatroomIds = useMemo(() => {
    const ids = options?.subscribedChatroomIds ?? [];
    return [...new Set(ids.filter(Boolean))].sort();
  }, [options?.subscribedChatroomIds]);
  const subscribedChatroomIdsKey = useMemo(() => subscribedChatroomIds.join('|'), [subscribedChatroomIds]);

  const sortMessagesByCreatedAt = useCallback((rows: ChatMessage[]) => {
    return [...rows].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, []);

  const upsertMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const index = prev.findIndex((item) => item.id === message.id);
      if (index === -1) {
        return sortMessagesByCreatedAt([...prev, message]);
      }
      const next = [...prev];
      next[index] = {
        ...next[index],
        ...message,
      };
      return sortMessagesByCreatedAt(next);
    });
  }, [sortMessagesByCreatedAt]);

  const appendOrCreateAiChunk = useCallback((params: {
    requestMessageId: string;
    streamMessageId: string;
    streamChatroomId: string;
    delta: string;
    done?: boolean;
  }) => {
    setMessages((prev) => {
      const fallbackId = `ai-stream-${params.requestMessageId}`;
      const messageIdCandidates = [params.streamMessageId, fallbackId];
      const index = prev.findIndex((item) => messageIdCandidates.includes(item.id));

      if (index === -1) {
        return sortMessagesByCreatedAt([
          ...prev,
          {
            id: params.streamMessageId,
            chatroomId: params.streamChatroomId,
            senderUserId: 'ai-assistant',
            aiModelId: 'streaming',
            content: params.delta,
            createdAt: new Date().toISOString(),
            isLoading: !params.done,
          },
        ]);
      }

      const next = [...prev];
      const current = next[index];
      next[index] = {
        ...current,
        id: params.streamMessageId,
        content: `${current.content ?? ''}${params.delta}`,
        isLoading: !params.done,
      };
      return sortMessagesByCreatedAt(next);
    });
  }, [sortMessagesByCreatedAt]);

  const completeAiMessage = useCallback((params: {
    requestMessageId: string;
    streamMessageId: string;
    finalContent?: string;
    streamChatroomId: string;
  }) => {
    setMessages((prev) => {
      const fallbackId = `ai-stream-${params.requestMessageId}`;
      const index = prev.findIndex((item) => item.id === params.streamMessageId || item.id === fallbackId);
      if (index === -1) {
        return sortMessagesByCreatedAt([
          ...prev,
          {
            id: params.streamMessageId,
            chatroomId: params.streamChatroomId,
            senderUserId: 'ai-assistant',
            aiModelId: 'streaming',
            content: params.finalContent ?? '',
            createdAt: new Date().toISOString(),
            isLoading: false,
          },
        ]);
      }

      const next = [...prev];
      next[index] = {
        ...next[index],
        id: params.streamMessageId,
        content: params.finalContent ?? next[index].content,
        isLoading: false,
      };
      return sortMessagesByCreatedAt(next);
    });
  }, [sortMessagesByCreatedAt]);

  const refreshMessages = useCallback(async () => {
    if (!token || !chatroomId) {
      setMessages([]);
      return [];
    }

    setIsLoading(true);
    setError(null);
    try {
      const loaded = await gatewayApi.chat.listMessages(token, chatroomId);
      setMessages(sortMessagesByCreatedAt(loaded));
      return loaded;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load messages';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [token, chatroomId, sortMessagesByCreatedAt]);

  useEffect(() => {
    setTypingUserIds([]);
    if (!chatroomId) {
      setMessages([]);
      return;
    }

    refreshMessages().catch(() => undefined);
  }, [chatroomId, refreshMessages]);

  useEffect(() => {
    if (!chatroomId) {
      if (activeAiAbortControllerRef.current) {
        activeAiAbortControllerRef.current.abort();
        activeAiAbortControllerRef.current = null;
      }
      setActiveAiRequestMessageId(null);
    }
  }, [chatroomId]);

  const handleRealtimeEvent = useCallback(
    (event: ChatRealtimeEvent) => {
      const activeChatroomId = activeChatroomIdRef.current;

      if (event.type === 'newChatroom') {
        onNewChatroomRef.current?.(event);
        if (!activeChatroomId || event.data.chatroomId !== activeChatroomId || !event.data.message) return;
        upsertMessage(event.data.message);
        return;
      }

      if (event.type === 'newMessage') {
        if (!activeChatroomId || event.chatroomId !== activeChatroomId) return;
        upsertMessage(event.data.message);
        return;
      }

      if (event.type === 'typing') {
        if (!activeChatroomId || event.chatroomId !== activeChatroomId) return;
        const { userId, isTyping } = event.data;
        setTypingUserIds((prev) => {
          if (isTyping && !prev.includes(userId)) return [...prev, userId];
          if (!isTyping) return prev.filter((id) => id !== userId);
          return prev;
        });
        return;
      }

      if (!('chatroomId' in event) || !activeChatroomId || event.chatroomId !== activeChatroomId) {
        return;
      }

      const streamEvent = event;
      const payload = streamEvent.data;
      const messageId = payload.messageId;

      if (streamEvent.type === 'AI_CHUNK') {
        setMessages((prev) => {
          const index = prev.findIndex((item) => item.id === messageId);
          if (index === -1) {
            return [
              ...prev,
              {
                id: messageId,
                chatroomId: activeChatroomId,
                senderUserId: 'ai-assistant',
                aiModelId: 'streaming',
                content: payload.contentDelta ?? '',
                createdAt: new Date().toISOString(),
                isLoading: !payload.done,
              },
            ];
          }

          const next = [...prev];
          const current = next[index];
          next[index] = {
            ...current,
            content: `${current.content ?? ''}${payload.contentDelta ?? ''}`,
            isLoading: !payload.done,
          };
          return next;
        });
        return;
      }

      if (streamEvent.type === 'AI_COMPLETED') {
        setMessages((prev) => {
          const index = prev.findIndex((item) => item.id === messageId);
          if (index === -1) return prev;
          const next = [...prev];
          next[index] = {
            ...next[index],
            content: payload.content ?? next[index].content,
            isLoading: false,
          };
          return next;
        });
        return;
      }

      if (streamEvent.type === 'AI_FAILED' || streamEvent.type === 'AI_CANCELLED') {
        setMessages((prev) => {
          const index = prev.findIndex((item) => item.id === messageId);
          if (index === -1) return prev;
          const next = [...prev];
          next[index] = {
            ...next[index],
            isLoading: false,
          };
          return next;
        });
      }
    },
    [upsertMessage],
  );

  useEffect(() => {
    if (!token) return;

    if (userReconnectTimerRef.current) {
      clearTimeout(userReconnectTimerRef.current);
      userReconnectTimerRef.current = null;
    }

    userSocketRef.current?.close();

    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;

      const socket = openChatSocket({
        accessToken: token,
        onOpen: () => {
          setIsSocketConnected((prev) => (prev ? prev : true));
          setError(null);
        },
        onMessage: handleRealtimeEvent,
        onError: () => {
          setIsSocketConnected((prev) => (prev ? false : prev));
        },
        onClose: () => {
          setIsSocketConnected((prev) => (prev ? false : prev));
          if (!isDisposed) {
            userReconnectTimerRef.current = setTimeout(connect, 2_000);
          }
        },
      });

      userSocketRef.current = socket;
    };

    connect();

    return () => {
      isDisposed = true;
      setIsSocketConnected((prev) => (prev ? false : prev));
      if (userReconnectTimerRef.current) {
        clearTimeout(userReconnectTimerRef.current);
        userReconnectTimerRef.current = null;
      }
      userSocketRef.current?.close();
      userSocketRef.current = null;
    };
  }, [token, handleRealtimeEvent]);

  useEffect(() => {
    if (!token) {
      roomReconnectTimersRef.current.forEach((timer) => clearTimeout(timer));
      roomReconnectTimersRef.current.clear();
      roomSocketsRef.current.forEach((socket) => socket.close());
      roomSocketsRef.current.clear();
      return;
    }

    const targetIds = new Set<string>(subscribedChatroomIds);
    if (chatroomId) {
      targetIds.add(chatroomId);
    }

    for (const [roomId, socket] of roomSocketsRef.current.entries()) {
      if (targetIds.has(roomId)) continue;
      socket.close();
      roomSocketsRef.current.delete(roomId);
      const reconnectTimer = roomReconnectTimersRef.current.get(roomId);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        roomReconnectTimersRef.current.delete(roomId);
      }
    }

    const connectRoom = (roomId: string) => {
      if (!roomId || roomSocketsRef.current.has(roomId)) return;

      const socket = openChatSocket({
        accessToken: token,
        chatroomId: roomId,
        onMessage: handleRealtimeEvent,
        onClose: () => {
          roomSocketsRef.current.delete(roomId);
          if (!targetIds.has(roomId)) return;
          const timer = setTimeout(() => {
            roomReconnectTimersRef.current.delete(roomId);
            if (targetIds.has(roomId)) {
              connectRoom(roomId);
            }
          }, 2_000);
          roomReconnectTimersRef.current.set(roomId, timer);
        },
      });

      roomSocketsRef.current.set(roomId, socket);
    };

    targetIds.forEach((roomId) => connectRoom(roomId));
  }, [token, chatroomId, subscribedChatroomIdsKey, handleRealtimeEvent]);

  useEffect(() => {
    return () => {
      if (userReconnectTimerRef.current) {
        clearTimeout(userReconnectTimerRef.current);
        userReconnectTimerRef.current = null;
      }
      userSocketRef.current?.close();
      userSocketRef.current = null;

      roomReconnectTimersRef.current.forEach((timer) => clearTimeout(timer));
      roomReconnectTimersRef.current.clear();
      roomSocketsRef.current.forEach((socket) => socket.close());
      roomSocketsRef.current.clear();
    };
  }, []);

  const listChatrooms = useCallback(async () => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.chat.listChatrooms(token);
  }, [token]);

  const getChatroom = useCallback(async (currentChatroomId: string) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.chat.getChatroom(token, currentChatroomId);
  }, [token]);

  const sendMessage = useCallback(async (input: {
    otherUserId?: string;
    chatroomId?: string;
    aiModelId?: string;
    content?: string;
    fileId?: string;
    fileBase64?: string;
    fileOriginalName?: string;
    fileContentType?: string;
  }) => {
    if (!token) throw new Error('Not authenticated');
        console.log("Send Message Reached")

    const result = await gatewayApi.chat.sendMessage(token, input);
    upsertMessage(result.message);

    // AI streaming is triggered when aiModelId is provided
    // Works for both AI-only chats and DM chats with AI assistance
    const shouldStreamAi = Boolean(input.aiModelId);
    if (shouldStreamAi) {
      if (activeAiAbortControllerRef.current) {
        activeAiAbortControllerRef.current.abort();
      }

      const requestMessageId = result.message.id;
      const streamChatroomId = result.chatroomId;
      const controller = new AbortController();
      activeAiAbortControllerRef.current = controller;
      setActiveAiRequestMessageId(requestMessageId);

      setMessages((prev) => {
        const placeholderId = `ai-stream-${requestMessageId}`;
        if (prev.some((item) => item.id === placeholderId)) {
          return prev;
        }

        return sortMessagesByCreatedAt([
          ...prev,
          {
            id: placeholderId,
            chatroomId: streamChatroomId,
            senderUserId: 'ai-assistant',
            aiModelId: input.aiModelId,
            content: '',
            createdAt: new Date().toISOString(),
            isLoading: true,
          },
        ]);
      });

      gatewayApi.chat.streamAiResponse({
        token,
        messageId: requestMessageId,
        chatroomId: streamChatroomId,
        signal: controller.signal,
        onChunk: ({ messageId, contentDelta, done }) => {
          appendOrCreateAiChunk({
            requestMessageId,
            streamMessageId: messageId,
            streamChatroomId,
            delta: contentDelta,
            done,
          });
        },
        onCompleted: ({ messageId, finalContent }) => {
          completeAiMessage({
            requestMessageId,
            streamMessageId: messageId,
            streamChatroomId,
            finalContent,
          });
          setActiveAiRequestMessageId((current) => (current === requestMessageId ? null : current));
          if (activeAiAbortControllerRef.current === controller) {
            activeAiAbortControllerRef.current = null;
          }
        },
        onFailed: ({ messageId, error: streamError }) => {
          completeAiMessage({
            requestMessageId,
            streamMessageId: messageId,
            streamChatroomId,
          });
          setError(streamError);
          setActiveAiRequestMessageId((current) => (current === requestMessageId ? null : current));
          if (activeAiAbortControllerRef.current === controller) {
            activeAiAbortControllerRef.current = null;
          }
        },
        onCancelled: ({ messageId }) => {
          completeAiMessage({
            requestMessageId,
            streamMessageId: messageId,
            streamChatroomId,
          });
          setActiveAiRequestMessageId((current) => (current === requestMessageId ? null : current));
          if (activeAiAbortControllerRef.current === controller) {
            activeAiAbortControllerRef.current = null;
          }
        },
      }).catch((streamError) => {
        if (controller.signal.aborted) {
          return;
        }

        setMessages((prev) => {
          const placeholderId = `ai-stream-${requestMessageId}`;
          const index = prev.findIndex((item) => item.id === placeholderId);
          if (index === -1) {
            return prev;
          }

          const next = [...prev];
          next[index] = {
            ...next[index],
            isLoading: false,
          };
          return next;
        });
        setError(streamError instanceof Error ? streamError.message : 'AI stream failed');

        setActiveAiRequestMessageId((current) => (current === requestMessageId ? null : current));
        if (activeAiAbortControllerRef.current === controller) {
          activeAiAbortControllerRef.current = null;
        }
      });
    }

    return result;
  }, [token, upsertMessage, sortMessagesByCreatedAt, appendOrCreateAiChunk, completeAiMessage]);

  const setTyping = useCallback(async (currentChatroomId: string, isTyping = true) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.chat.setTyping(token, currentChatroomId, isTyping);
  }, [token]);

  const cancelAiMessage = useCallback(async (messageId: string) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.chat.cancelAiMessage(token, messageId);
  }, [token]);

  const stopActiveAiStream = useCallback(async () => {
    const messageId = activeAiRequestMessageId;
    if (!messageId) return;

    if (activeAiAbortControllerRef.current) {
      activeAiAbortControllerRef.current.abort();
      activeAiAbortControllerRef.current = null;
    }

    try {
      await cancelAiMessage(messageId);
    } finally {
      setActiveAiRequestMessageId(null);
    }
  }, [activeAiRequestMessageId, cancelAiMessage]);

  const listAiModels = useCallback(async () => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.chat.listAiModels(token);
  }, [token]);

  const createUserApiKey = useCallback(async (input: { modelId: string; apiKey: string }) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.chat.createUserApiKey(token, input);
  }, [token]);

  const updateUserApiKey = useCallback(async (input: { modelId: string; apiKey: string }) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.chat.updateUserApiKey(token, input);
  }, [token]);

  const deleteUserApiKey = useCallback(async (modelId: string) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.chat.deleteUserApiKey(token, modelId);
  }, [token]);

  return useMemo(() => ({
    messages,
    isLoading,
    error,
    isSocketConnected,
    isAiStreaming: Boolean(activeAiRequestMessageId),
    activeAiRequestMessageId,
    typingUserIds,
    refreshMessages,
    listChatrooms,
    getChatroom,
    sendMessage,
    setTyping,
    cancelAiMessage,
    stopActiveAiStream,
    listAiModels,
    createUserApiKey,
    updateUserApiKey,
    deleteUserApiKey,
  }), [
    cancelAiMessage,
    createUserApiKey,
    deleteUserApiKey,
    error,
    getChatroom,
    isLoading,
    isSocketConnected,
    activeAiRequestMessageId,
    listAiModels,
    listChatrooms,
    messages,
    stopActiveAiStream,
    refreshMessages,
    sendMessage,
    setTyping,
    typingUserIds,
    updateUserApiKey,
  ]);
}
