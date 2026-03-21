'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AIModel } from '@/src/lib/types';
import { Sparkles, Send, Loader2, Paperclip, X, FilePlus2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  onSendMessage: (content: string, aiModelId?: string, attachedFileIds?: string[]) => Promise<void>;
  onCancelStream?: () => Promise<void> | void;
  onTypingChange?: (isTyping: boolean) => Promise<void> | void;
  isCompact?: boolean;
  models?: AIModel[];
  allowFileDrop?: boolean;
  selectedAiModelId?: string | null;
  onSelectedAiModelChange?: (modelId: string) => void;
  isAiStreaming?: boolean;
}

const WORKSPACE_CHAT_FILE_MIME = 'application/x-workspace-file';

interface AttachedWorkspaceFile {
  id: string;
  originalName: string;
  contentType?: string;
}

export function ChatComposer({
  onSendMessage,
  onCancelStream,
  onTypingChange,
  isCompact,
  models = [],
  allowFileDrop = false,
  selectedAiModelId,
  onSelectedAiModelChange,
  isAiStreaming = false,
}: ChatComposerProps) {
  const [content, setContent] = useState('');
  const [aiModelId, setAiModelId] = useState(models[0]?.id ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedWorkspaceFile[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedAiModelId = useMemo(() => {
    const preferredModelId = selectedAiModelId ?? aiModelId;
    if (models.some((model) => model.id === preferredModelId)) {
      return preferredModelId;
    }

    return models[0]?.id ?? '';
  }, [aiModelId, models, selectedAiModelId]);

  useEffect(() => {
    if (!resolvedAiModelId) {
      return;
    }

    if (selectedAiModelId !== resolvedAiModelId) {
      onSelectedAiModelChange?.(resolvedAiModelId);
    }
  }, [onSelectedAiModelChange, resolvedAiModelId, selectedAiModelId]);

  const handleModelChange = (nextModelId: string) => {
    setAiModelId(nextModelId);
    onSelectedAiModelChange?.(nextModelId);
  };

  const handleSend = async () => {
    if ((!content.trim() && attachedFiles.length === 0) || isLoading) return;

    setIsLoading(true);
    try {
      await onSendMessage(content, resolvedAiModelId || undefined, attachedFiles.map((file) => file.id));
      setContent('');
      setAttachedFiles([]);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      onTypingChange?.(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (value: string) => {
    setContent(value);
    if (!onTypingChange) return;

    if (value.trim().length === 0) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      onTypingChange(false);
      return;
    }

    onTypingChange(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange(false);
      typingTimeoutRef.current = null;
    }, 1200);
  };

  const attachWorkspaceFile = (file: AttachedWorkspaceFile) => {
    setAttachedFiles((previous) => {
      if (previous.some((item) => item.id === file.id)) {
        return previous;
      }

      return [...previous, file];
    });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!allowFileDrop) return;

    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);

    const rawPayload = event.dataTransfer.getData(WORKSPACE_CHAT_FILE_MIME);
    if (!rawPayload) {
      return;
    }

    try {
      const parsed = JSON.parse(rawPayload) as AttachedWorkspaceFile;
      if (!parsed.id || !parsed.originalName) {
        return;
      }

      attachWorkspaceFile(parsed);
    } catch {
      // ignore invalid payloads
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!allowFileDrop) return;

    if (!event.dataTransfer.types.includes(WORKSPACE_CHAT_FILE_MIME)) {
      return;
    }

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

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles((previous) => previous.filter((file) => file.id !== fileId));
  };

  return (
    <div className={cn(
        "border-t border-border/50 bg-background/50 backdrop-blur-xl transition-all",
        isCompact ? "p-2 space-y-2" : "p-4 space-y-3"
    )}>
      {/* Model Selection Row - Only show in expanded or if selected */}
      {!isCompact && models.length > 0 && (
        <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-full border border-border/50">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Model:</span>
            <Select value={resolvedAiModelId} onValueChange={handleModelChange} disabled={isLoading}>
                <SelectTrigger className="h-5 border-none bg-transparent hover:bg-accent focus:ring-0 p-0 px-1 gap-1 text-xs w-auto min-w-20">
                <SelectValue />
                </SelectTrigger>
                <SelectContent>
                {models.map((model) => (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      className="text-xs"
                      disabled={model.platformKeyAvailable === false && !model.userKeyConfigured}
                    >
                    {model.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>
        </div>
      )}

      {attachedFiles.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-border/60 bg-muted/20 p-2">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-36 truncate">{file.originalName}</span>
              <button
                type="button"
                className="rounded-sm text-muted-foreground hover:text-foreground"
                onClick={() => removeAttachedFile(file.id)}
                aria-label="Remove attached file"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Input Composer */}
      <div className={cn(
          "relative flex items-end gap-2 bg-muted/30 border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-primary/50 transition-all shadow-sm",
          isCompact ? "rounded-lg p-1" : "rounded-xl p-2",
          isDraggingOver && "border-primary ring-1 ring-primary/50 bg-primary/5"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >

        {!isCompact ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg mb-0.5"
            title={allowFileDrop ? 'Drag a file from the left sidebar into this box' : 'Open or create a chatroom to attach files'}
            disabled
          >
            {allowFileDrop ? <FilePlus2 className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
          </Button>
        ) : null}

        <textarea
            ref={textareaRef}
            placeholder={isCompact ? "Ask AI..." : "Ask a question about your document..."}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onTypingChange?.(false)}
            disabled={isLoading}
            className={cn(
                "flex-1 w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none placeholder:text-muted-foreground/70 disabled:opacity-50",
                isCompact ? "text-xs min-h-7 py-1 px-1" : "text-sm min-h-5 max-h-50 px-1 py-1.5"
            )}
            rows={1}
            style={{ overflow: 'hidden' }}
        />

        <Button
          onClick={isAiStreaming ? () => onCancelStream?.() : handleSend}
          disabled={isLoading || (!isAiStreaming && !content.trim() && attachedFiles.length === 0)}
            className={cn(
                "shrink-0 rounded-lg transition-all",
                isCompact ? "h-7 w-7 mb-0" : "h-8 w-8 mb-0.5",
          isAiStreaming || content.trim() || attachedFiles.length > 0 ? "opacity-100 hover:scale-105" : "opacity-50"
            )}
            size="icon"
          title={isAiStreaming ? 'Stop AI generation' : 'Send message'}
        >
          {isLoading ? (
            <Loader2 className={cn("animate-spin", isCompact ? "h-3 w-3" : "h-4 w-4")} />
          ) : isAiStreaming ? (
            <X className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
            ) : (
                <Send className={cn(isCompact ? "h-3 w-3" : "h-4 w-4")} />
            )}
        </Button>
      </div>
      
      {!isCompact && (
          <div className="text-[10px] text-center text-muted-foreground/40 font-medium">
            AI can make mistakes. Please verify important information.
          </div>
      )}
    </div>
  );
}
