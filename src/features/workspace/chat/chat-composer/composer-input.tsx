import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FilePlus2, Loader2, Paperclip, Send, X } from 'lucide-react';
import { NO_AI_MODEL_VALUE } from './types';

interface ComposerInputProps {
  isCompact?: boolean;
  allowFileDrop: boolean;
  isDraggingOver: boolean;
  isLoading: boolean;
  isAiStreaming: boolean;
  content: string;
  attachedCount: number;
  hasAiModels: boolean;
  isDirectChat: boolean;
  resolvedAiModelId: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onBlur: () => void;
  onSubmit: () => void;
  onCancelStream?: () => Promise<void> | void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
}

export function ComposerInput(props: ComposerInputProps) {
  const {
    isCompact,
    allowFileDrop,
    isDraggingOver,
    isLoading,
    isAiStreaming,
    content,
    attachedCount,
    hasAiModels,
    isDirectChat,
    resolvedAiModelId,
    textareaRef,
    onChange,
    onBlur,
    onSubmit,
    onCancelStream,
    onDrop,
    onDragOver,
    onDragLeave,
  } = props;

  return (
    <div
      className={cn(
        'relative flex items-end gap-2 bg-muted/30 border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-primary/50 transition-all shadow-sm',
        isCompact ? 'rounded-lg p-1' : 'rounded-xl p-2',
        isDraggingOver && 'border-primary ring-1 ring-primary/50 bg-primary/5',
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
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
        placeholder={
          isDirectChat
            ? (resolvedAiModelId !== NO_AI_MODEL_VALUE
              ? (isCompact ? 'Message + AI...' : 'Write message and get AI response...')
              : (isCompact ? 'Write a message...' : 'Write your message...'))
            : (hasAiModels
              ? (isCompact ? 'Ask AI...' : 'Ask a question about your document...')
              : (isCompact ? 'Write a message...' : 'Write your message...'))
        }
        value={content}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        onBlur={onBlur}
        disabled={isLoading}
        className={cn(
          'flex-1 w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none placeholder:text-muted-foreground/70 disabled:opacity-50',
          isCompact ? 'text-xs min-h-7 py-1 px-1' : 'text-sm min-h-5 max-h-50 px-1 py-1.5',
        )}
        rows={1}
        style={{ overflow: 'hidden' }}
      />

      <Button
        onClick={isAiStreaming ? () => onCancelStream?.() : onSubmit}
        disabled={isLoading || (!isAiStreaming && !content.trim() && attachedCount === 0) || (hasAiModels && !isDirectChat && !resolvedAiModelId)}
        className={cn(
          'shrink-0 rounded-lg transition-all',
          isCompact ? 'h-7 w-7 mb-0' : 'h-8 w-8 mb-0.5',
          isAiStreaming || content.trim() || attachedCount > 0 ? 'opacity-100 hover:scale-105' : 'opacity-50',
        )}
        size="icon"
      >
        {isLoading ? (
          <Loader2 className={cn('animate-spin', isCompact ? 'h-3 w-3' : 'h-4 w-4')} />
        ) : isAiStreaming ? (
          <X className={cn(isCompact ? 'h-3 w-3' : 'h-4 w-4')} />
        ) : (
          <Send className={cn(isCompact ? 'h-3 w-3' : 'h-4 w-4')} />
        )}
      </Button>
    </div>
  );
}
