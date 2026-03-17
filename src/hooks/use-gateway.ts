'use client';

import useSWR from 'swr';
import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { gatewayApi } from '@/src/lib/api/gateway';
import { openChatSocket } from '@/src/lib/api/gateway-chat';
import { assertUploadFileSize } from '@/src/lib/api/gateway-file-utils';
import {
  AuthSession,
  ChatMessage,
  NewChatroomEvent,
  ChatRealtimeEvent,
  FileItem,
  FileUploadStatus,
  Folder,
  ProfileVisibility,
  Role,
  UserProfile,
} from '@/src/lib/types';

const EMPTY_FOLDERS: Folder[] = [];
const EMPTY_FILES: FileItem[] = [];

export function useGatewayProfile(token?: string | null) {
  const shouldFetch = Boolean(token);

  const query = useSWR(
    shouldFetch ? ['profile-me', token] : null,
    () => gatewayApi.profile.getMe(token as string),
    {
      revalidateOnFocus: true,
      dedupingInterval: 15_000,
    }
  );

  const refresh = query.mutate;

  const updateProfile = useCallback(async (input: {
    firstName?: string;
    lastName?: string;
    universityId?: string;
    department?: string;
    bio?: string;
    profileImageFileId?: string;
  }) => {
    if (!token) throw new Error('Not authenticated');
    const updated = await gatewayApi.profile.updateMe(token, input);
    await query.mutate(updated, { revalidate: false });
    return updated;
  }, [query, token]);

  const updateVisibility = useCallback(async (visibility: ProfileVisibility) => {
    if (!token) throw new Error('Not authenticated');
    await gatewayApi.profile.updateVisibility(token, visibility);
    await query.mutate();
  }, [query, token]);

  const getByUserId = useCallback(async (userId: string) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.profile.getByUserId(token, userId);
  }, [token]);

  const searchProfiles = useCallback(async (input: { nameQuery?: string; page?: number; size?: number }) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.profile.search(token, input);
  }, [token]);

  return useMemo(() => ({
    profile: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
    updateProfile,
    updateVisibility,
    getByUserId,
    searchProfiles,
  }), [getByUserId, query.data, query.error, query.isLoading, refresh, searchProfiles, updateProfile, updateVisibility]);
}

export function useGatewayFiles(token?: string | null) {
  const shouldFetch = Boolean(token);

  const foldersQuery = useSWR(
    shouldFetch ? ['folders', token] : null,
    () => gatewayApi.files.listFolders(token as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  );

  const filesQuery = useSWR(
    shouldFetch ? ['files', token] : null,
    () => gatewayApi.files.listMyFiles(token as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  );

  const filesByFolder = useMemo(() => {
    const mapping: Record<string, FileItem[]> = {};
    for (const file of filesQuery.data ?? EMPTY_FILES) {
      if (!mapping[file.folderId]) {
        mapping[file.folderId] = [];
      }
      mapping[file.folderId].push(file);
    }
    return mapping;
  }, [filesQuery.data]);

  // Destructure mutate functions so useCallback deps are stable SWR references
  const { mutate: mutateFolders } = foldersQuery;
  const { mutate: mutateFiles } = filesQuery;

  const refreshAll = useCallback(async () => {
    await Promise.all([mutateFolders(), mutateFiles()]);
  }, [mutateFolders, mutateFiles]);

  const getFile = useCallback(async (fileId: string) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.files.getFile(token, fileId);
  }, [token]);

  const createFolder = useCallback(async (input: { name: string; parentId?: string }) => {
    if (!token) throw new Error('Not authenticated');
    const created = await gatewayApi.files.createFolder(token, input);
    await refreshAll();
    return created;
  }, [token, refreshAll]);

  const updateFolder = useCallback(async (folderId: string, input: { name: string }) => {
    if (!token) throw new Error('Not authenticated');
    const updated = await gatewayApi.files.updateFolder(token, folderId, input);
    await refreshAll();
    return updated;
  }, [token, refreshAll]);

  const deleteFolder = useCallback(async (folderId: string) => {
    if (!token) throw new Error('Not authenticated');
    await gatewayApi.files.deleteFolder(token, folderId);
    await refreshAll();
  }, [token, refreshAll]);

  const deleteFile = useCallback(async (fileId: string) => {
    if (!token) throw new Error('Not authenticated');
    await gatewayApi.files.deleteFile(token, fileId);
    await refreshAll();
  }, [token, refreshAll]);

  const updateFileMetadata = useCallback(async (fileId: string, input: { isShareable: boolean }) => {
    if (!token) throw new Error('Not authenticated');
    await gatewayApi.files.updateFileMetadata(token, fileId, input);
    await refreshAll();
  }, [token, refreshAll]);

  const uploadFiles = useCallback(async (
    filesToUpload: File[],
    folderId: string,
    options?: { onStatusChange?: (status: FileUploadStatus) => void }
  ) => {
    if (!token) throw new Error('Not authenticated');
    if (filesToUpload.length === 0) return [];

    const uploadedFiles: FileItem[] = [];
    const totalFiles = filesToUpload.length;

    for (const [index, file] of filesToUpload.entries()) {
      assertUploadFileSize(file);

      options?.onStatusChange?.({
        phase: 'uploading',
        totalFiles,
        completedFiles: index,
        currentFileName: file.name,
        currentFileProgress: 0,
        overallProgress: Math.round((index / totalFiles) * 100),
      });

      const uploadedFile = await gatewayApi.files.uploadFile(token, {
        file,
        fileType: 'DOCUMENT',
        folderId,
        isShareable: true,
        onProgress: ({ percent }) => {
          options?.onStatusChange?.({
            phase: 'uploading',
            totalFiles,
            completedFiles: index,
            currentFileName: file.name,
            currentFileProgress: percent,
            overallProgress: Math.min(100, Math.round(((index + percent / 100) / totalFiles) * 100)),
          });
        },
      });
      uploadedFiles.push(uploadedFile);
    }

    options?.onStatusChange?.({
      phase: 'syncing',
      totalFiles,
      completedFiles: uploadedFiles.length,
      currentFileName: uploadedFiles[uploadedFiles.length - 1]?.originalName,
      currentFileProgress: 100,
      overallProgress: 100,
    });

    await refreshAll();
    return uploadedFiles;
  }, [token, refreshAll]);

  return {
    folders: foldersQuery.data ?? EMPTY_FOLDERS,
    files: filesQuery.data ?? EMPTY_FILES,
    filesByFolder,
    isLoading: foldersQuery.isLoading || filesQuery.isLoading,
    error:
      (foldersQuery.error instanceof Error && foldersQuery.error.message) ||
      (filesQuery.error instanceof Error && filesQuery.error.message) ||
      null,
    refreshAll,
    getFile,
    createFolder,
    updateFolder,
    deleteFolder,
    deleteFile,
    updateFileMetadata,
    uploadFiles,
  };
}

export function useGatewayFile(token?: string | null, fileId?: string | null) {
  const shouldFetch = Boolean(token && fileId);

  const query = useSWR(
    shouldFetch ? ['file', token, fileId] : null,
    () => gatewayApi.files.getFile(token as string, fileId as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
      keepPreviousData: true,
    }
  );

  return {
    file: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: query.mutate,
  };
}

interface UseGatewayChatOptions {
  subscribedChatroomIds?: string[];
  onNewChatroom?: (event: NewChatroomEvent) => void;
}

export function useGatewayChat(token?: string | null, chatroomId?: string | null, options?: UseGatewayChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  const userSocketRef = useRef<WebSocket | null>(null);
  const roomSocketsRef = useRef(new Map<string, WebSocket>());
  const userReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomReconnectTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const activeChatroomIdRef = useRef<string | null>(chatroomId ?? null);
  const onNewChatroomRef = useRef<UseGatewayChatOptions['onNewChatroom']>(options?.onNewChatroom);

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
    const result = await gatewayApi.chat.sendMessage(token, input);
    upsertMessage(result.message);
    return result;
  }, [token, upsertMessage]);

  const setTyping = useCallback(async (currentChatroomId: string, isTyping = true) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.chat.setTyping(token, currentChatroomId, isTyping);
  }, [token]);

  const cancelAiMessage = useCallback(async (messageId: string) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.chat.cancelAiMessage(token, messageId);
  }, [token]);

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
    typingUserIds,
    refreshMessages,
    listChatrooms,
    getChatroom,
    sendMessage,
    setTyping,
    cancelAiMessage,
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
    listAiModels,
    listChatrooms,
    messages,
    refreshMessages,
    sendMessage,
    setTyping,
    typingUserIds,
    updateUserApiKey,
  ]);
}

export function useGatewayAuth() {
  return {
    signup: (payload: { email: string; username: string; password: string; role: Role }) => gatewayApi.auth.signup(payload),
    login: (payload: { email: string; password: string }) => gatewayApi.auth.login(payload),
    verifyEmail: (payload: { token: string }) => gatewayApi.auth.verifyEmail(payload),
    refresh: (payload: { refreshToken: string }) => gatewayApi.auth.refresh(payload),
    logout: (refreshToken: string) => gatewayApi.auth.logout(refreshToken),
    forgotPassword: (payload: { email: string }) => gatewayApi.auth.forgotPassword(payload),
    resetPassword: (payload: { token: string; newPassword: string }) => gatewayApi.auth.resetPassword(payload),
  };
}

export type GatewayAuthSession = AuthSession;
export type GatewayProfile = UserProfile;
