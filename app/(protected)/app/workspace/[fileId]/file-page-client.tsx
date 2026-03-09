'use client';

import { useEffect, useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { FileViewerShell, getFileCategory } from '@/src/features/file-viewer';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '@/src/features/workspace/workspace-context';

interface FilePageClientProps {
  file: FileItem;
}

async function fetchPreviewBlob(fileId: string, accessToken: string, accept: string): Promise<Blob> {
  const gatewayBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '') || 'http://localhost:8080';
  const response = await fetch(`${gatewayBaseUrl}/files/${fileId}/preview`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: accept || '*/*',
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const apiError = await response.json();
      throw new Error(apiError?.message || `Preview request failed with status ${response.status}`);
    }

    throw new Error(`Preview request failed with status ${response.status}`);
  }

  return response.blob();
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

  // Sync selectedFileId in context so the sidebar highlights the correct file
  useEffect(() => {
    setSelectedFileId(file.id);
    return () => {
      setSelectedFileId(null);
    };
  }, [file.id, setSelectedFileId]);

  useEffect(() => {
    const category = getFileCategory(file.contentType);
    const accessToken = session?.accessToken;

    setTextContent(undefined);
    setObjectUrl(undefined);
    setDownloadBlob(null);

    if (!accessToken) {
      return;
    }

    if (category !== 'pdf' && category !== 'image' && category !== 'code' && category !== 'video' && category !== 'audio') {
      return;
    }

    let cancelled = false;
    let nextObjectUrl: string | null = null;

    const loadPreview = async () => {
      try {
        const blob = await fetchPreviewBlob(file.id, accessToken, file.contentType || '*/*');

        if (cancelled) {
          return;
        }

        setDownloadBlob(blob);

        if (blob.type.startsWith('text/') || ['application/json', 'application/xml'].includes(blob.type)) {
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
  }, [file.contentType, file.id, session?.accessToken]);

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
      const blob = await fetchPreviewBlob(file.id, session.accessToken, file.contentType || '*/*');
      const url = URL.createObjectURL(blob);
      triggerDownload(url, file.originalName);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file', error);
    }
  };

  return (
    <FileViewerShell
      file={file}
      src={objectUrl}
      textContent={textContent}
      onDownload={handleDownload}
    />
  );
}
