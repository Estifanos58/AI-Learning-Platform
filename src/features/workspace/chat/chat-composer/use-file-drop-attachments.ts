import { useState } from 'react';
import { AttachedWorkspaceFile, WORKSPACE_CHAT_FILE_MIME } from './types';

interface UseFileDropAttachmentsOptions {
  allowFileDrop: boolean;
}

export function useFileDropAttachments({ allowFileDrop }: UseFileDropAttachmentsOptions) {
  const [attachedFiles, setAttachedFiles] = useState<AttachedWorkspaceFile[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles((previous) => previous.filter((file) => file.id !== fileId));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!allowFileDrop) return;

    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);

    const rawPayload = event.dataTransfer.getData(WORKSPACE_CHAT_FILE_MIME);
    if (!rawPayload) return;

    try {
      const parsed = JSON.parse(rawPayload) as AttachedWorkspaceFile;
      if (!parsed.id || !parsed.originalName) return;

      setAttachedFiles((previous) => {
        if (previous.some((item) => item.id === parsed.id)) return previous;
        return [...previous, parsed];
      });
    } catch {
      // ignore invalid payloads
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!allowFileDrop) return;
    if (!event.dataTransfer.types.includes(WORKSPACE_CHAT_FILE_MIME)) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!allowFileDrop) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.relatedTarget === null || !event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  return {
    attachedFiles,
    setAttachedFiles,
    isDraggingOver,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    removeAttachedFile,
  };
}
