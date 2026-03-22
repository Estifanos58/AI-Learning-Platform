'use client';

import { useRightChatPanel } from '@/src/hooks/use-right-chat-panel';
import { ChatroomList } from './right-chat-panel/chatroom-list';
import { ActiveChatView } from './right-chat-panel/active-chat-view';

interface RightChatPanelProps {
  isOpen: boolean;
}

export function RightChatPanel({ isOpen }: RightChatPanelProps) {
  const vm = useRightChatPanel();

  if (!isOpen) return null;

  return (
    <aside className="w-full h-full border-l border-border bg-card flex flex-col overflow-hidden">
      {!vm.hasActiveConversation ? (
        <ChatroomList
          searchTerm={vm.searchTerm}
          onSearchChange={vm.setSearchTerm}
          showSearchResults={vm.showSearchResults}
          isSearchingUsers={vm.isSearchingUsers}
          searchResults={vm.searchResults}
          isChatroomsLoading={vm.isChatroomsLoading}
          chatrooms={vm.chatrooms}
          userId={vm.userId}
          displayNames={vm.displayNames}
          onOpenDraftDm={vm.openDraftDm}
          onOpenChatroom={vm.openChatroom}
        />
      ) : (
        <ActiveChatView
          chatroom={vm.chatroom}
          isCompact={vm.isCompact}
          isSocketConnected={vm.isSocketConnected}
          activeChatTitle={vm.activeChatTitle}
          activeChatSubtitle={vm.activeChatSubtitle}
          activeChatInitial={vm.activeChatInitial}
          draftOtherUserId={vm.draftOtherUserId}
          messages={vm.messages}
          typingUserIds={vm.typingUserIds}
          userId={vm.userId}
          aiModels={vm.aiModels}
          currentAiModelId={vm.currentAiModelId}
          isAiStreaming={vm.isAiStreaming}
          hasActiveConversation={vm.hasActiveConversation}
          onBack={vm.closeConversation}
          onSendMessage={vm.handleSendMessage}
          onCancelStream={vm.stopActiveAiStream}
          onAiModelChange={vm.handleAiModelChange}
          onTypingChange={vm.onTypingChange}
        />
      )}
    </aside>
  );
}
