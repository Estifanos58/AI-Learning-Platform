'use client';

import { useEffect, useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { FileViewerShell, base64ToObjectUrl, getFileCategory } from '@/src/features/file-viewer';
import { useWorkspace } from '@/src/features/workspace/workspace-context';

interface FilePageClientProps {
  file: FileItem;
  textContent?: string;
  base64Content?: string;
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function FilePageClient({ file, textContent, base64Content }: FilePageClientProps) {
  const { setSelectedFileId } = useWorkspace();
  const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);

  // Sync selectedFileId in context so the sidebar highlights the correct file
  useEffect(() => {
    setSelectedFileId(file.id);
    return () => {
      setSelectedFileId(null);
    };
  }, [file.id, setSelectedFileId]);

  // Build an object URL from the server-provided base64 content for binary files
  useEffect(() => {
    const category = getFileCategory(file.contentType);
    if ((category === 'pdf' || category === 'image') && base64Content) {
      const url = base64ToObjectUrl(base64Content, file.contentType) ?? undefined;
      setObjectUrl(url);
      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    }
    setObjectUrl(undefined);
  }, [file.id, file.contentType, base64Content]);

  const handleDownload = () => {
    if (objectUrl) {
      triggerDownload(objectUrl, file.originalName);
      return;
    }

    if (textContent) {
      const blob = new Blob([textContent], { type: file.contentType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, file.originalName);
      URL.revokeObjectURL(url);
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
