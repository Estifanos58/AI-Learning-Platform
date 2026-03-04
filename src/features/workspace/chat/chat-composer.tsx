'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AIModel } from '@/src/lib/types';
import { Sparkles, Send, Loader2, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  onSendMessage: (content: string, aiModelId?: string) => Promise<void>;
  isCompact?: boolean;
  models?: AIModel[];
}

const DEFAULT_MODELS: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    description: 'Most capable model',
  },
];

export function ChatComposer({ onSendMessage, isCompact, models = DEFAULT_MODELS }: ChatComposerProps) {
  const [content, setContent] = useState('');
  const [aiModelId, setAiModelId] = useState(models[0]?.id ?? 'gpt-4');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!models.some((model) => model.id === aiModelId)) {
      setAiModelId(models[0]?.id ?? 'gpt-4');
    }
  }, [models, aiModelId]);

  const handleSend = async () => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onSendMessage(content, aiModelId);
      setContent('');
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

  return (
    <div className={cn(
        "border-t border-border/50 bg-background/50 backdrop-blur-xl transition-all",
        isCompact ? "p-2 space-y-2" : "p-4 space-y-3"
    )}>
      {/* Model Selection Row - Only show in expanded or if selected */}
      {!isCompact && (
        <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-full border border-border/50">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Model:</span>
            <Select value={aiModelId} onValueChange={setAiModelId} disabled={isLoading}>
                <SelectTrigger className="h-5 border-none bg-transparent hover:bg-accent focus:ring-0 p-0 px-1 gap-1 text-xs w-auto min-w-[80px]">
                <SelectValue />
                </SelectTrigger>
                <SelectContent>
                {models.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="text-xs">
                    {model.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>
        </div>
      )}

      {/* Input Composer */}
      <div className={cn(
          "relative flex items-end gap-2 bg-muted/30 border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-primary/50 transition-all shadow-sm",
          isCompact ? "rounded-lg p-1" : "rounded-xl p-2"
        )}>
        {!isCompact && (
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg mb-0.5"
                title="Attach a file"
            >
                <Paperclip className="h-4 w-4" />
            </Button>
        )}

        <textarea
            ref={textareaRef}
            placeholder={isCompact ? "Ask AI..." : "Ask a question about your document..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className={cn(
                "flex-1 w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none placeholder:text-muted-foreground/70 disabled:opacity-50",
                isCompact ? "text-xs min-h-[28px] py-1 px-1" : "text-sm min-h-[20px] max-h-[200px] px-1 py-1.5"
            )}
            rows={1}
            style={{ overflow: 'hidden' }}
        />

        <Button
            onClick={handleSend}
            disabled={isLoading || !content.trim()}
            className={cn(
                "shrink-0 rounded-lg transition-all",
                isCompact ? "h-7 w-7 mb-0" : "h-8 w-8 mb-0.5",
                content.trim() ? "opacity-100 hover:scale-105" : "opacity-50"
            )}
            size="icon"
        >
            {isLoading ? (
                <Loader2 className={cn("animate-spin", isCompact ? "h-3 w-3" : "h-4 w-4")} />
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
