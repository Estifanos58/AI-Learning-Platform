'use client';

import { Chatroom } from '@/src/lib/types';
import { EmptyState } from '@/src/components/common/states';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowRight } from 'lucide-react';
import { isDirectChatroom } from './is-direct-chatroom';

interface ChatroomsListProps {
  isLoading: boolean;
  chatrooms: Chatroom[];
  userId?: string;
  displayNames: Record<string, string>;
  onSelect: (room: Chatroom) => void;
}

export function ChatroomsList({ isLoading, chatrooms, userId, displayNames, onSelect }: ChatroomsListProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading chatrooms...
      </div>
    );
  }

  if (chatrooms.length === 0) {
    return <EmptyState icon="💬" title="No chatrooms yet" description="Search for users to start a direct message" />;
  }

  return (
    <div className="space-y-1">
      {chatrooms.map((room) => {
        const isDirect = isDirectChatroom(room);
        const otherUserId = isDirect
          ? room.otherUserId ?? room.memberIds.find((id) => id !== userId)
          : null;
        const roomTitle = isDirect
          ? room.otherUserName || (otherUserId ? displayNames[otherUserId] : null) || otherUserId || room.name || 'Direct message'
          : room.name || 'AI Assistant';
        const avatarFileId = isDirect ? room.otherUserProfileImageFileId : null;

        return (
          <button
            type="button"
            key={room.id}
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-accent/50"
            onClick={() => onSelect(room)}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-7 w-7 border border-border/60 bg-muted">
                {avatarFileId && <AvatarImage src={`/api/files/${avatarFileId}/content`} alt={roomTitle} />}
                <AvatarFallback className="text-xs font-semibold">{roomTitle.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{roomTitle}</p>
                <p className="truncate text-xs text-muted-foreground">{isDirect ? 'Direct message' : room.type}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}
