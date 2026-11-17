'use client';

import { Chatroom, UserProfile } from '@/src/lib/types';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { SearchResultsList } from './search-results-list';
import { ChatroomsList } from './chatrooms-list';

interface ChatroomListProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showSearchResults: boolean;
  isSearchingUsers: boolean;
  searchResults: UserProfile[];
  isChatroomsLoading: boolean;
  chatrooms: Chatroom[];
  userId?: string;
  displayNames: Record<string, string>;
  onOpenDraftDm: (profile: UserProfile) => void;
  onOpenChatroom: (room: Chatroom) => void;
}

export function ChatroomList({
  searchTerm,
  onSearchChange,
  showSearchResults,
  isSearchingUsers,
  searchResults,
  isChatroomsLoading,
  chatrooms,
  userId,
  displayNames,
  onOpenDraftDm,
  onOpenChatroom,
}: ChatroomListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 bg-background/50 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search users"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {showSearchResults ? (
          <SearchResultsList
            isLoading={isSearchingUsers}
            results={searchResults}
            onSelect={onOpenDraftDm}
          />
        ) : (
          <ChatroomsList
            isLoading={isChatroomsLoading}
            chatrooms={chatrooms}
            userId={userId}
            displayNames={displayNames}
            onSelect={onOpenChatroom}
          />
        )}
      </div>
    </div>
  );
}
