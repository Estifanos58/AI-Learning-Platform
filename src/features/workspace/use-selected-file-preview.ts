'use client';

import { useEffect, useState } from 'react';
import { getFileCategory } from '@/src/features/file-viewer';
import { FileItem } from '@/src/lib/types';
import { useWorkspace } from './workspace-context';
import { buildRemoteFilePreview } from './workspace-file-preview';

function revokePreview(preview?: { src?: string }) {
  if (preview?.src?.startsWith('blob:')) {
    URL.revokeObjectURL(preview.src);
  }
}

export function useSelectedFilePreview(file: FileItem | null) {
  const { filePreviews, setFilePreview } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = file ? filePreviews[file.id] : undefined;
  const category = file ? getFileCategory(file.contentType) : null;
  const needsRemotePreview = category === 'pdf' || category === 'image' || category === 'code' || category === 'document' || category === 'spreadsheet' || category === 'presentation';

  useEffect(() => {
    if (!file || !needsRemotePreview) {
      setIsLoading(false);
      setError(null);
      return;
    }

    if (preview?.src || preview?.textContent) {
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const nextPreview = await buildRemoteFilePreview(file, `/api/files/${file.id}/content`);

        if (cancelled) {
          revokePreview(nextPreview);
          return;
        }

        if (nextPreview.src || nextPreview.textContent) {
          setFilePreview(file.id, nextPreview);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load preview');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [file, needsRemotePreview, preview?.src, preview?.textContent, setFilePreview]);

  return {
    preview,
    isLoading,
    error,
  };
}