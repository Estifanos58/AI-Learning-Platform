import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FilePlus2, Loader2, Paperclip, Send, Sparkles, X } from 'lucide-react';
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
  isAiTagged: boolean;
  selectedModelName: string | null;
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
    isAiTagged,
    selectedModelName,
    textareaRef,
    onChange,
    onBlur,
    onSubmit,
    onCancelStream,
    onDrop,
    onDragOver,
    onDragLeave,
  } = props;

  const getPlaceholder = () => {
    if (isAiTagged) {
      return isCompact ? 'Ask AI...' : 'Type your question for AI...';
    }
    if (isDirectChat) {
      return isCompact ? 'Write a message...' : 'Write your message... (type @AI to invoke AI)';
    }
    if (hasAiModels) {
      return isCompact ? 'Message...' : 'Write a message... (type @AI to invoke AI)';
    }
    return isCompact ? 'Write a message...' : 'Write your message...';
  };

  return (
    <div
      className={cn(
        'relative flex flex-col gap-0 bg-muted/30 border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-primary/50 transition-all shadow-sm',
        isCompact ? 'rounded-lg' : 'rounded-xl',
        isDraggingOver && 'border-primary ring-1 ring-primary/50 bg-primary/5',
        isAiTagged && 'border-primary/40 ring-1 ring-primary/20 bg-gradient-to-b from-primary/[0.03] to-transparent',
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* AI active indicator strip */}
      {isAiTagged && (
        <div className={cn(
          'flex items-center gap-1.5 border-b border-primary/15',
          isCompact ? 'px-2 py-1' : 'px-3 py-1.5',
        )}>
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
          <span className="text-[10px] font-medium text-primary/80">
            AI Mode • {selectedModelName || 'Select a model'}
          </span>
        </div>
      )}

      <div className={cn('flex items-end gap-2', isCompact ? 'p-1' : 'p-2')}>
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
          placeholder={getPlaceholder()}
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
          disabled={isLoading || (!isAiStreaming && !content.trim() && attachedCount === 0)}
          className={cn(
            'shrink-0 rounded-lg transition-all',
            isCompact ? 'h-7 w-7 mb-0' : 'h-8 w-8 mb-0.5',
            isAiTagged && 'bg-primary hover:bg-primary/90',
            isAiStreaming || content.trim() || attachedCount > 0 ? 'opacity-100 hover:scale-105' : 'opacity-50',
          )}
          size="icon"
        >
          {isLoading ? (
            <Loader2 className={cn('animate-spin', isCompact ? 'h-3 w-3' : 'h-4 w-4')} />
          ) : isAiStreaming ? (
            <X className={cn(isCompact ? 'h-3 w-3' : 'h-4 w-4')} />
          ) : isAiTagged ? (
            <Sparkles className={cn(isCompact ? 'h-3 w-3' : 'h-4 w-4')} />
          ) : (
            <Send className={cn(isCompact ? 'h-3 w-3' : 'h-4 w-4')} />
          )}
        </Button>
      </div>
    </div>
  );
}
