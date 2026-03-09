'use client';

import useSWR from 'swr';
import { useMemo, useCallback } from 'react';
import { gatewayApi, fileToBase64 } from '@/src/lib/api/gateway';
import { getFileContentType } from '@/src/lib/api/gateway-file-utils';
import { AuthSession, FileItem, Folder, ProfileVisibility, Role, UserProfile } from '@/src/lib/types';

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

  const uploadFiles = useCallback(async (filesToUpload: File[], folderId: string) => {
    if (!token) throw new Error('Not authenticated');

    const uploadedFiles: FileItem[] = [];

    for (const file of filesToUpload) {
      const contentBase64 = await fileToBase64(file);
      const uploadedFile = await gatewayApi.files.uploadFile(token, {
        fileType: 'DOCUMENT',
        folderId,
        originalName: file.name,
        contentType: getFileContentType(file),
        contentBase64,
        isShareable: true,
      });
      uploadedFiles.push(uploadedFile);
    }

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
  const shouldFetchMessages = Boolean(token && chatroomId);

  const messagesQuery = useSWR(
    shouldFetchMessages ? ['chat-messages', token, chatroomId] : null,
    () => gatewayApi.chat.listMessages(token as string, chatroomId as string),
    {
      revalidateOnFocus: true,
      dedupingInterval: 5_000,
    }
  );

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error instanceof Error ? messagesQuery.error.message : null,
    refreshMessages: messagesQuery.mutate,
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
      await messagesQuery.mutate();
      return result;
    },
    setTyping: async (currentChatroomId: string, isTyping = true) => {
      if (!token) throw new Error('Not authenticated');
      return gatewayApi.chat.setTyping(token, currentChatroomId, isTyping);
    },
    getModels: gatewayApi.chat.getModels,
    createChatroomForFileMockFallback: gatewayApi.chat.createChatroomForFile,
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
