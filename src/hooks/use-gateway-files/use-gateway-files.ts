'use client';

import useSWR from 'swr';
import { useMemo, useCallback } from 'react';
import { gatewayApi } from '@/src/lib/api/gateway';
import { assertUploadFileSize } from '@/src/lib/api/gateway-file-utils';
import { FileItem, FileUploadStatus, Folder } from '@/src/lib/types';

const EMPTY_FOLDERS: Folder[] = [];
const EMPTY_FILES: FileItem[] = [];

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
