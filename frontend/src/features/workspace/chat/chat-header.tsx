'use client';

import { Chatroom } from '@/src/lib/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '../workspace-context';

interface ChatHeaderProps {
  chatroom?: Chatroom | null;
  isCompact?: boolean;
  isSocketConnected?: boolean;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}

export function ChatHeader({ chatroom, isCompact, isSocketConnected, title, subtitle, onBack }: ChatHeaderProps) {
  const { toggleChatPanel } = useWorkspace(); // Assuming toggleChatPanel exists

  const resolvedTitle = title || chatroom?.name || 'Document Chat';
  const resolvedSubtitle = subtitle || (isSocketConnected ? 'Realtime connected' : 'Realtime reconnecting...');

  return (
    <div className={cn(
        "border-b border-border/50 bg-background/50 backdrop-blur-xl flex items-center justify-between transition-all",
        isCompact ? "h-10 px-2" : "h-14 px-4 py-3"
    )}>
      {onBack ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn("mr-1 text-muted-foreground hover:text-foreground", isCompact ? "h-6 w-6" : "h-8 w-8")}
          onClick={onBack}
          aria-label="Back to chat list"
        >
          <ArrowLeft className={cn(isCompact ? 'h-3 w-3' : 'h-4 w-4')} />
        </Button>
      ) : null}

      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <h3 className={cn("font-semibold truncate", isCompact ? "text-xs" : "text-sm")}>
            {resolvedTitle}
        </h3>
        {!isCompact && (
            <p className="text-xs text-muted-foreground truncate">
              {resolvedSubtitle}
            </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className={cn("text-muted-foreground hover:text-foreground", isCompact ? "h-6 w-6" : "h-8 w-8")}>
            <Settings className={cn("transition-all", isCompact ? "h-3 w-3" : "h-4 w-4")} />
        </Button>
        <Button 
            variant="ghost" 
            size="icon" 
            className={cn("md:hidden text-muted-foreground hover:text-foreground", isCompact ? "h-6 w-6" : "h-8 w-8")}
            onClick={toggleChatPanel}
        >
            <X className={cn("transition-all", isCompact ? "h-3 w-3" : "h-4 w-4")} />
        </Button>
      </div>
    </div>
  );
}
