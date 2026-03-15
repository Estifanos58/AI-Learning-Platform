'use client';

import useSWR from 'swr';
import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { gatewayApi } from '@/src/lib/api/gateway';
import { openChatSocket } from '@/src/lib/api/gateway-chat';
import { assertUploadFileSize } from '@/src/lib/api/gateway-file-utils';
import {
  AuthSession,
  ChatMessage,
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

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: query.mutate,
    updateProfile: async (input: {
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
    },
    updateVisibility: async (visibility: ProfileVisibility) => {
      if (!token) throw new Error('Not authenticated');
      await gatewayApi.profile.updateVisibility(token, visibility);
      await query.mutate();
    },
  };
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

export function useGatewayChat(token?: string | null, chatroomId?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const upsertMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const index = prev.findIndex((item) => item.id === message.id);
      if (index === -1) {
        return [...prev, message];
      }
      const next = [...prev];
      next[index] = {
        ...next[index],
        ...message,
      };
      return next;
    });
  }, []);

  const refreshMessages = useCallback(async () => {
    if (!token || !chatroomId) {
      setMessages([]);
      return [];
    }

    setIsLoading(true);
    setError(null);
    try {
      const loaded = await gatewayApi.chat.listMessages(token, chatroomId);
      setMessages(loaded);
      return loaded;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load messages';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [token, chatroomId]);

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
      if (event.type === 'newMessage') {
        if (!chatroomId || event.chatroomId !== chatroomId) return;
        upsertMessage(event.data.message);
        return;
      }

      if (event.type === 'typing') {
        if (!chatroomId || event.chatroomId !== chatroomId) return;
        const { userId, isTyping } = event.data;
        setTypingUserIds((prev) => {
          if (isTyping && !prev.includes(userId)) return [...prev, userId];
          if (!isTyping) return prev.filter((id) => id !== userId);
          return prev;
        });
        return;
      }

      if (!('chatroomId' in event) || !chatroomId || event.chatroomId !== chatroomId) {
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
                chatroomId,
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
    [chatroomId, upsertMessage],
  );

  useEffect(() => {
    if (!token) return;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    socketRef.current?.close();

    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;

      const socket = openChatSocket({
        accessToken: token,
        chatroomId: chatroomId ?? undefined,
        onOpen: () => {
          setIsSocketConnected(true);
          setError(null);
        },
        onMessage: handleRealtimeEvent,
        onError: () => {
          setIsSocketConnected(false);
        },
        onClose: () => {
          setIsSocketConnected(false);
          if (!isDisposed) {
            reconnectTimerRef.current = setTimeout(connect, 2_000);
          }
        },
      });

      socketRef.current = socket;
    };

    connect();

    return () => {
      isDisposed = true;
      setIsSocketConnected(false);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [token, chatroomId, handleRealtimeEvent]);

  return {
    messages,
    isLoading,
    error,
    isSocketConnected,
    typingUserIds,
    refreshMessages,
    listChatrooms: async () => {
      if (!token) throw new Error('Not authenticated');
      return gatewayApi.chat.listChatrooms(token);
    },
    getChatroom: async (currentChatroomId: string) => {
      if (!token) throw new Error('Not authenticated');
      return gatewayApi.chat.getChatroom(token, currentChatroomId);
    },
    sendMessage: async (input: {
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
    },
    setTyping: async (currentChatroomId: string, isTyping = true) => {
      if (!token) throw new Error('Not authenticated');
      return gatewayApi.chat.setTyping(token, currentChatroomId, isTyping);
    },
    cancelAiMessage: async (messageId: string) => {
      if (!token) throw new Error('Not authenticated');
      return gatewayApi.chat.cancelAiMessage(token, messageId);
    },
  };
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
