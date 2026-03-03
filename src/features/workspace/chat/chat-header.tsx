'use client';

import { Chatroom } from '@/src/lib/types';
import { cn } from '@/lib/utils';
import { Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '../workspace-context';

interface ChatHeaderProps {
  chatroom: Chatroom;
  isCompact?: boolean;
}

export function ChatHeader({ chatroom, isCompact }: ChatHeaderProps) {
  const { toggleChatPanel } = useWorkspace(); // Assuming toggleChatPanel exists

  return (
    <div className={cn(
        "border-b border-border/50 bg-background/50 backdrop-blur-xl flex items-center justify-between transition-all",
        isCompact ? "h-10 px-2" : "h-14 px-4 py-3"
    )}>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <h3 className={cn("font-semibold truncate", isCompact ? "text-xs" : "text-sm")}>
            {chatroom.name || "Chat Context"}
        </h3>
        {!isCompact && (
            <p className="text-xs text-muted-foreground truncate">Ask about your document</p>
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
