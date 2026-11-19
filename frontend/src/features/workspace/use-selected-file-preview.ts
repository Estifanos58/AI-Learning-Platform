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
  const [loadState, setLoadState] = useState<{
    fileId: string | null;
    isLoading: boolean;
    error: string | null;
  }>({ fileId: null, isLoading: false, error: null });

  const preview = file ? filePreviews[file.id] : undefined;
  const category = file ? getFileCategory(file.contentType) : null;
  const needsRemotePreview =
    category === 'pdf' ||
    category === 'image' ||
    category === 'code' ||
    category === 'document' ||
    category === 'spreadsheet' ||
    category === 'presentation';
  const hasCachedPreview = Boolean(preview?.src || preview?.textContent);

  useEffect(() => {
    if (!file || !needsRemotePreview || hasCachedPreview) {
      return;
    }

    let cancelled = false;
    const fileId = file.id;

    const loadPreview = async () => {
      setLoadState({ fileId, isLoading: true, error: null });
      try {
        const nextPreview = await buildRemoteFilePreview(file, `/api/files/${fileId}/content`);

        if (cancelled) {
          revokePreview(nextPreview);
          return;
        }

        if (nextPreview.src || nextPreview.textContent) {
          setFilePreview(fileId, nextPreview);
        }
        setLoadState({ fileId, isLoading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          setLoadState({
            fileId,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load preview',
          });
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [file, needsRemotePreview, hasCachedPreview, setFilePreview]);

  const activeForFile = file && needsRemotePreview && !hasCachedPreview && loadState.fileId === file.id;

  return {
    preview,
    isLoading: activeForFile ? loadState.isLoading : false,
    error: activeForFile ? loadState.error : null,
  };
}
