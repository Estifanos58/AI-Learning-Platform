'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { FileViewerShell, getFileCategory } from '@/src/features/file-viewer';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '@/src/features/workspace/workspace-context';

interface FilePageClientProps {
  file: FileItem;
}

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

function resolveGatewayBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '');
  if (!base) return 'http://localhost:8080/api/internal';
  // if (base.endsWith('/api/internal')) return base;
  return `${base}/api/internal`;
}

function parseApiErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload && 'message' in payload) {
    const maybeMessage = (payload as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  return `File request failed with status ${status}`;
}

async function fetchFileBlob(fileId: string, accessToken: string, accept: string): Promise<Blob> {
  const gatewayBaseUrl = resolveGatewayBaseUrl();
  const endpoints = [`/files/${fileId}/preview`];
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    const response = await fetch(`${gatewayBaseUrl}${endpoint}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: accept || '*/*',
      },
    });

    if (response.ok) {
      return response.blob();
    }

    if (response.status === 404) {
      lastError = new Error(`File endpoint not found (${endpoint})`);
      continue;
    }

    const responseContentType = response.headers.get('content-type') || '';
    if (responseContentType.includes('application/json')) {
      let apiErrorPayload: unknown;
      try {
        apiErrorPayload = await response.json();
      } catch {
        // If JSON parsing fails, fall back to a generic status message.
        let fallbackMessage = `File request failed with status ${response.status}`;
        try {
          const textPayload = await response.text();
          if (textPayload.trim()) {
            fallbackMessage = textPayload;
          }
        } catch {
          // ignore secondary parsing errors
        }
        throw new Error(fallbackMessage);
      }

      throw new Error(parseApiErrorMessage(apiErrorPayload, response.status));
    }

    throw new Error(`File request failed with status ${response.status}`);
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

export function FilePageClient({ file }: FilePageClientProps) {
  const { session } = useAuth();
  const { setSelectedFileId } = useWorkspace();
  const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);
  const [textContent, setTextContent] = useState<string | undefined>(undefined);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const resolvedContentType = useMemo(() => resolveContentType(file), [file]);
  const resolvedFile = useMemo(() => ({ ...file, contentType: resolvedContentType }), [file, resolvedContentType]);
  const publicUrl = useMemo(() => resolvePublicUrl(file), [file]);
  const category = useMemo(() => getFileCategory(resolvedContentType), [resolvedContentType]);

  // Sync selectedFileId in context so the sidebar highlights the correct file
  useEffect(() => {
    setSelectedFileId(file.id);
    return () => {
      setSelectedFileId(null);
    };
  }, [file.id, setSelectedFileId]);

  useEffect(() => {
    const accessToken = session?.accessToken;

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
  }, [category, file.id, resolvedContentType, session?.accessToken]);

  const handleDownload = async () => {
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

    if (!session?.accessToken) {
      return;
    }

    try {
      const blob = await fetchFileBlob(file.id, session.accessToken, resolvedContentType || '*/*');
      const url = URL.createObjectURL(blob);
      triggerDownload(url, file.originalName);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file', error);
    }
  };

  return (
    <FileViewerShell
      file={resolvedFile}
      src={objectUrl}
      publicUrl={publicUrl}
      textContent={textContent}
      onDownload={handleDownload}
    />
  );
}
