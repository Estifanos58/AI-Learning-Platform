'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/src/contexts/auth';
import { useGatewayFiles } from '@/src/hooks/use-gateway';
import { FileViewerShell } from '@/src/features/file-viewer';
import { useFilePagePreview } from '@/src/hooks/app/use-file-page-preview';
import { useWorkspace } from '@/src/features/workspace/workspace-context';

export function FileTabPreview({ fileId }: { fileId: string }) {
  const { session } = useAuth();
  const { files, isLoading } = useGatewayFiles(session?.accessToken);
  const { setSelectedFileId, setChatroomId, setDraftOtherUserId } = useWorkspace();

  const file = files.find(f => f.id === fileId);

  useEffect(() => {
    setSelectedFileId(fileId);
    setChatroomId(null);
    setDraftOtherUserId(null);
  }, [fileId, setChatroomId, setDraftOtherUserId, setSelectedFileId]);

  const preview = useFilePagePreview({ 
     file: file || {} as any, 
     accessToken: session?.accessToken 
  });

  if (isLoading && !file) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground w-full h-full">
        Loading document...
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground w-full h-full">
        Document not found
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full overflow-hidden bg-background">
      <FileViewerShell
        file={preview.resolvedFile}
        src={preview.objectUrl}
        publicUrl={preview.publicUrl}
        textContent={preview.textContent}
        onDownload={preview.handleDownload}
      />
    </div>
  );
}
