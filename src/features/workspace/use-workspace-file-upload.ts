'use client';

import { useCallback } from 'react';
import { FileItem, FileUploadStatus, Folder } from '@/src/lib/types';
import { useWorkspace } from './workspace-context';
import { buildLocalFilePreview } from './workspace-file-preview';

interface UseWorkspaceFileUploadOptions {
  folders: Folder[];
  selectedFolderId: string | null;
  createFolder: (input: { name: string; parentId?: string }) => Promise<Folder>;
  uploadFiles: (
    filesToUpload: File[],
    folderId: string,
    options?: { onStatusChange?: (status: FileUploadStatus) => void }
  ) => Promise<FileItem[]>;
}

export function useWorkspaceFileUpload({
  folders,
  selectedFolderId,
  createFolder,
  uploadFiles,
}: UseWorkspaceFileUploadOptions) {
  const { setSelectedFileId, setFilePreview } = useWorkspace();

  const uploadIntoWorkspace = useCallback(async (
    filesToUpload: File[],
    folderIdOverride?: string | null,
    options?: { onStatusChange?: (status: FileUploadStatus) => void }
  ) => {
    let targetFolderId = folderIdOverride ?? selectedFolderId;
    const totalFiles = filesToUpload.length;

    if (!targetFolderId) {
      if (folders.length > 0) {
        targetFolderId = folders[0].id;
      } else {
        const createdFolder = await createFolder({ name: 'Uploads' });
        targetFolderId = createdFolder.id;
      }
    }

    if (!targetFolderId) {
      throw new Error('No folder available to upload files into');
    }

    options?.onStatusChange?.({
      phase: 'preparing',
      totalFiles,
      completedFiles: 0,
      currentFileName: filesToUpload[0]?.name,
      currentFileProgress: 0,
      overallProgress: 0,
    });

    const previews = await Promise.all(filesToUpload.map((file) => buildLocalFilePreview(file)));
    const uploadedFiles = await uploadFiles(filesToUpload, targetFolderId, {
      onStatusChange: options?.onStatusChange,
    });

    uploadedFiles.forEach((uploadedFile, index) => {
      const preview = previews[index];
      if (preview?.src || preview?.textContent) {
        setFilePreview(uploadedFile.id, preview);
      }
    });

    if (uploadedFiles[0]) {
      setSelectedFileId(uploadedFiles[0].id);
    }

    return uploadedFiles;
  }, [createFolder, folders, selectedFolderId, setFilePreview, setSelectedFileId, uploadFiles]);

  return {
    uploadIntoWorkspace,
  };
}