'use client';

import { AIModel, ChatMessage, Chatroom } from '@/src/lib/types';
import { cn } from '@/lib/utils';
import { UserRound } from 'lucide-react';
import { ChatHeader } from '../chat-header';
import { ChatMessageList } from '../chat-message-list';
import { ChatComposer } from '../chat-composer';
import { isDirectChatroom } from './is-direct-chatroom';

interface ActiveChatViewProps {
  chatroom: Chatroom | null;
  isCompact: boolean;
  isSocketConnected: boolean;
  activeChatTitle: string;
  activeChatSubtitle: string;
  activeChatInitial: string;
  draftOtherUserId: string | null;
  messages: ChatMessage[];
  typingUserIds: string[];
  userId?: string;
  aiModels: AIModel[];
  currentAiModelId: string | null;
  isAiStreaming: boolean;
  hasActiveConversation: boolean;
  onBack: () => void;
  onSendMessage: (content: string, aiModelId?: string, attachedFileIds?: string[]) => Promise<void>;
  onCancelStream: () => void;
  onAiModelChange: (modelId: string | null) => void;
  onTypingChange?: (isTyping: boolean) => void;
}

export function ActiveChatView({
  chatroom,
  isCompact,
  isSocketConnected,
  activeChatTitle,
  activeChatSubtitle,
  activeChatInitial,
  draftOtherUserId,
  messages,
  typingUserIds,
  userId,
  aiModels,
  currentAiModelId,
  isAiStreaming,
  hasActiveConversation,
  onBack,
  onSendMessage,
  onCancelStream,
  onAiModelChange,
  onTypingChange,
}: ActiveChatViewProps) {
  return (
    <div className={cn('flex h-full', isCompact && 'text-xs')}>
      <div className="flex w-16 shrink-0 flex-col items-center border-r border-border/50 bg-background/60 pt-4">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {activeChatInitial}
        </div>
        {(isDirectChatroom(chatroom) || draftOtherUserId) && (
          <UserRound className="mt-3 h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          chatroom={chatroom}
          isCompact={isCompact}
          isSocketConnected={isSocketConnected}
          title={activeChatTitle}
          subtitle={activeChatSubtitle}
          onBack={onBack}
        />
        <ChatMessageList messages={messages} isCompact={isCompact} currentUserId={userId} typingUserIds={typingUserIds} />
        <ChatComposer
          onSendMessage={onSendMessage}
          onCancelStream={onCancelStream}
          onTypingChange={onTypingChange ? async (isTyping) => onTypingChange(isTyping) : undefined}
          isCompact={isCompact}
          allowFileDrop={hasActiveConversation}
          selectedAiModelId={currentAiModelId}
          onSelectedAiModelChange={onAiModelChange}
          isAiStreaming={isAiStreaming}
          models={aiModels}
          isDirectChat={isDirectChatroom(chatroom) || Boolean(draftOtherUserId)}
        />
      </div>
    </div>
  );
}
