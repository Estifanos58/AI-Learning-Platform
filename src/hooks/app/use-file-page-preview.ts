import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { getFileCategory } from '@/src/features/file-viewer';
import { apiRequestBlob } from '@/src/lib/api/gateway-core';
import { GatewayApiError } from '@/src/lib/api/gateway-errors';

const EXTENSION_CONTENT_TYPE_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  js: 'application/javascript',
  ts: 'application/typescript',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

interface UseFilePagePreviewOptions {
  file: FileItem;
  accessToken?: string;
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function resolveContentType(file: FileItem): string {
  const contentType = file.contentType?.trim().toLowerCase();
  if (contentType && contentType !== 'application/octet-stream' && contentType !== 'binary/octet-stream') {
    return contentType;
  }

  return EXTENSION_CONTENT_TYPE_MAP[getFileExtension(file.originalName)] || file.contentType || 'application/octet-stream';
}

async function fetchFileBlob(fileId: string, token: string, accept: string): Promise<Blob> {
  const endpoints = [`/files/${fileId}/preview`];
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      return await apiRequestBlob(endpoint, {
        method: 'GET',
        token,
        cache: 'no-store',
        headers: {
          Accept: accept || '*/*',
        },
      });
    } catch (error) {
      if (error instanceof GatewayApiError && error.status === 404) {
        lastError = new Error(`File endpoint not found (${endpoint})`);
        continue;
      }

      lastError = error instanceof Error ? error : new Error('File request failed');
      break;
    }
  }

  throw lastError || new Error('Unable to fetch file content');
}

function resolvePublicUrl(file: FileItem): string | undefined {
  if (!file.isShareable) return undefined;

  const path = file.storagePath?.trim();
  if (!path) return undefined;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return undefined;
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function useFilePagePreview({ file, accessToken }: UseFilePagePreviewOptions) {
  const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);
  const [textContent, setTextContent] = useState<string | undefined>(undefined);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);

  const resolvedContentType = useMemo(() => resolveContentType(file), [file]);
  const resolvedFile = useMemo(() => ({ ...file, contentType: resolvedContentType }), [file, resolvedContentType]);
  const publicUrl = useMemo(() => resolvePublicUrl(file), [file]);
  const category = useMemo(() => getFileCategory(resolvedContentType), [resolvedContentType]);

  useEffect(() => {
    setTextContent(undefined);
    setObjectUrl(undefined);
    setDownloadBlob(null);

    if (!accessToken) {
      return;
    }

    if (category !== 'pdf' && category !== 'image' && category !== 'code' && category !== 'video' && category !== 'audio' && category !== 'document' && category !== 'spreadsheet' && category !== 'presentation') {
      return;
    }

    let cancelled = false;
    let nextObjectUrl: string | null = null;

    const loadPreview = async () => {
      try {
        const blob = await fetchFileBlob(file.id, accessToken, resolvedContentType || '*/*');

        if (cancelled) {
          return;
        }

        setDownloadBlob(blob);

        if (blob.type.startsWith('text/') || ['application/json', 'application/xml', 'application/javascript', 'application/typescript'].includes(blob.type)) {
          setTextContent(await blob.text());
          setObjectUrl(undefined);
          return;
        }

        nextObjectUrl = URL.createObjectURL(blob);
        setTextContent(undefined);
        setObjectUrl(nextObjectUrl);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load file preview', error);
          setTextContent(undefined);
          setObjectUrl(undefined);
          setDownloadBlob(null);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [accessToken, category, file.id, resolvedContentType]);

  const handleDownload = useCallback(async () => {
    if (downloadBlob) {
      const url = URL.createObjectURL(downloadBlob);
      triggerDownload(url, file.originalName);
      URL.revokeObjectURL(url);
      return;
    }

    if (textContent) {
      const blob = new Blob([textContent], { type: file.contentType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, file.originalName);
      URL.revokeObjectURL(url);
      return;
    }

    if (!accessToken) {
      return;
    }

    try {
      const blob = await fetchFileBlob(file.id, accessToken, resolvedContentType || '*/*');
      const url = URL.createObjectURL(blob);
      triggerDownload(url, file.originalName);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file', error);
    }
  }, [accessToken, downloadBlob, file, resolvedContentType, textContent]);

  return {
    resolvedFile,
    objectUrl,
    textContent,
    publicUrl,
    handleDownload,
  };
}
