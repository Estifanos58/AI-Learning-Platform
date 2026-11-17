import { getFileCategory } from '@/src/features/file-viewer';
import { getFileContentType } from '@/src/lib/api/gateway-file-utils';
import { apiRequestBlob } from '@/src/lib/api/gateway-core';
import { FileItem } from '@/src/lib/types';

export interface WorkspaceFilePreview {
  src?: string;
  textContent?: string;
}

export async function buildLocalFilePreview(file: File): Promise<WorkspaceFilePreview> {
  const contentType = getFileContentType(file);
  const category = getFileCategory(contentType);

  if (category === 'pdf' || category === 'image' || category === 'document' || category === 'spreadsheet' || category === 'presentation') {
    return { src: URL.createObjectURL(file) };
  }

  if (category === 'code') {
    return { textContent: await file.text() };
  }

  return {};
}

export async function buildRemoteFilePreview(file: FileItem, endpoint: string): Promise<WorkspaceFilePreview> {
  const blob = await apiRequestBlob(endpoint, {
    baseUrl: '',
    cache: 'no-store',
    credentials: 'include',
    headers: {
      Accept: '*/*',
    },
  });

  return buildFilePreviewFromBlob(file, blob);
}

async function buildFilePreviewFromBlob(file: FileItem, blob: Blob): Promise<WorkspaceFilePreview> {
  const category = getFileCategory(file.contentType);

  if (category === 'code') {
    return { textContent: await blob.text() };
  }

  if (category === 'pdf' || category === 'image' || category === 'document' || category === 'spreadsheet' || category === 'presentation') {
    if (!blob.size) {
      return {};
    }

    return { src: URL.createObjectURL(blob) };
  }

  return {};
}