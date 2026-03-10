import { getFileCategory } from '@/src/features/file-viewer';
import { getFileContentType } from '@/src/lib/api/gateway-file-utils';
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
  const response = await fetch(endpoint, {
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to load file content (${response.status})`);
  }

  return buildFilePreviewFromResponse(file, response);
}

async function buildFilePreviewFromResponse(file: FileItem, response: Response): Promise<WorkspaceFilePreview> {
  const category = getFileCategory(file.contentType);

  if (category === 'code') {
    return { textContent: await response.text() };
  }

  if (category === 'pdf' || category === 'image' || category === 'document' || category === 'spreadsheet' || category === 'presentation') {
    const blob = await response.blob();
    if (!blob.size) {
      return {};
    }

    return { src: URL.createObjectURL(blob) };
  }

  return {};
}