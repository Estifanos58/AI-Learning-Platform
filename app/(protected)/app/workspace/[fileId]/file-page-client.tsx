'use client';

import { useEffect } from 'react';
import { FileItem } from '@/src/lib/types';
import { FileViewerShell } from '@/src/features/file-viewer';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '@/src/features/workspace/workspace-context';
import { useFilePagePreview } from '@/src/hooks/app/use-file-page-preview';

interface FilePageClientProps {
  file: FileItem;
}

export function FilePageClient({ file }: FilePageClientProps) {
  const { session } = useAuth();
  const { setSelectedFileId, setChatroomId, setDraftOtherUserId } = useWorkspace();
  const {
    resolvedFile,
    objectUrl,
    textContent,
    publicUrl,
    handleDownload,
  } = useFilePagePreview({ file, accessToken: session?.accessToken });

  // Sync selectedFileId in context so the sidebar highlights the correct file
  useEffect(() => {
    setSelectedFileId(file.id);
    setChatroomId(null);
    setDraftOtherUserId(null);
    return () => {
      setSelectedFileId(null);
    };
  }, [file.id, setChatroomId, setDraftOtherUserId, setSelectedFileId]);

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
