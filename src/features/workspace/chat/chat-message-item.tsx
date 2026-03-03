'use client';

import { ChatMessage } from '@/src/lib/types';
import { cn } from '@/lib/utils';
import { User, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar'; 

interface ChatMessageItemProps {
  message: ChatMessage;
  isCompact?: boolean;
}

export function ChatMessageItem({ message, isCompact }: ChatMessageItemProps) {
  const isAI = message.senderUserId === 'ai-assistant';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
        className={cn(
            "group flex w-full gap-2 py-1 animate-in fade-in slide-in-from-bottom-2 duration-300", 
            isAI ? "justify-start" : "justify-end",
            isCompact ? "text-xs" : "text-sm"
        )}
    >
      {/* Avatar (Left for AI) */}
      {isAI && (
        <Avatar className={cn(
            "border border-border bg-muted/50 flex items-center justify-center shrink-0 mt-0.5",
            isCompact ? "h-6 w-6" : "h-8 w-8"
        )}>
            <Sparkles className={cn("text-primary animate-pulse-slow", isCompact ? "h-3 w-3" : "h-4 w-4")} />
        </Avatar>
      )}

      {/* Message Bubble Container */}
      <div className={cn(
        "flex flex-col relative",
        isCompact ? "max-w-[90%]" : "max-w-[85%] sm:max-w-[75%]",
        isAI ? "items-start" : "items-end"
      )}>
        {/* Name Label */}
        {!isCompact && (
            <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground/70 tracking-wider">
                    {isAI ? 'Assistant' : 'You'}
                </span>
                <span className="text-[10px] text-muted-foreground/40 hidden group-hover:block transition-opacity">
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        )}

        {/* Bubble */}
        <div 
            className={cn(
                "relative shadow-sm backdrop-blur-sm transition-all leading-relaxed",
                isCompact ? "px-3 py-2 rounded-xl" : "px-4 py-3 rounded-2xl",
                isAI 
                    ? "bg-card border border-border/50 text-card-foreground rounded-tl-sm hover:border-border" 
                    : "bg-primary text-primary-foreground rounded-tr-sm hover:bg-primary/90"
            )}
        >
            {message.isLoading ? (
                <div className="flex items-center gap-1 h-4 px-1">
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" />
                </div>
            ) : (
                <div className="whitespace-pre-wrap break-words">
                    {message.content}
                </div>
            )}
        </div>

        {/* Actions (Only for AI messages, visible on hover) */}
        {isAI && !message.isLoading && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 px-1">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full"
                    onClick={handleCopy}
                    title="Copy text"
                >
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
            </div>
        )}
      </div>

      {/* Avatar (Right for User) */}
      {!isAI && (
        <Avatar className="h-8 w-8 border border-border bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <User className="h-4 w-4 text-primary" />
        </Avatar>
      )}
    </div>
  );
}
