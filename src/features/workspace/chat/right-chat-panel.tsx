'use client';

import { useEffect, useState } from 'react';
import { Chatroom } from '@/src/lib/types';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '../workspace-context';
import { useGatewayChat } from '@/src/hooks/use-gateway';
import { ChatHeader } from './chat-header';
import { ChatMessageList } from './chat-message-list';
import { ChatComposer } from './chat-composer';
import { EmptyState } from '@/src/components/common/states';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RightChatPanelProps {
  isOpen: boolean;
}

export function RightChatPanel({ isOpen }: RightChatPanelProps) {
  const { user, session } = useAuth();
  const { selectedFileId, chatroomId, setChatroomId, rightSidebarWidth } = useWorkspace();
  const [chatroom, setChatroom] = useState<Chatroom | null>(null);
  const {
    messages,
    sendMessage,
    getChatroom,
    setTyping,
    isSocketConnected,
    typingUserIds,
  } = useGatewayChat(
    session?.accessToken,
    chatroomId
  );

  const isCompact = rightSidebarWidth < 320; // Mobile-like breakpoint

  useEffect(() => {
    setChatroom(null);
    setChatroomId(null);
  }, [selectedFileId, setChatroomId]);

  useEffect(() => {
    const loadActiveRoom = async () => {
      if (!session?.accessToken || !chatroomId) {
        setChatroom(null);
        return;
      }

      try {
        const room = await getChatroom(chatroomId);
        setChatroom(room);
      } catch {
        setChatroom((prev) =>
          prev && prev.id === chatroomId
            ? prev
            : {
                id: chatroomId,
                type: 'DOCUMENT_CONTEXT',
                memberIds: user?.id ? [user.id] : [],
                createdAt: new Date().toISOString(),
              },
        );
      }
    };

    loadActiveRoom();
  }, [session?.accessToken, chatroomId, getChatroom, user?.id]);

  const handleSendMessage = async (content: string, aiModelId?: string) => {
    if (!user?.id) return;

    try {
      const response = await sendMessage({
        chatroomId: chatroom?.id,
        content,
        aiModelId,
        fileId: selectedFileId ?? undefined,
      });

      if (!chatroom || chatroom.id !== response.chatroomId) {
        setChatroom({
          id: response.chatroomId,
          type: 'DOCUMENT_CONTEXT',
          memberIds: [user.id],
          createdAt: new Date().toISOString(),
        });
        setChatroomId(response.chatroomId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="w-full h-full border-l border-border bg-card flex flex-col overflow-hidden">
      {!selectedFileId ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <EmptyState
            icon="💬"
            title="Select a file"
            description="Open a document to start chatting"
          />
        </div>
      ) : (
        <div className={cn("flex flex-col h-full", isCompact && "text-xs")}>
          <ChatHeader chatroom={chatroom} isCompact={isCompact} isSocketConnected={isSocketConnected} />
          <ChatMessageList messages={messages} isCompact={isCompact} currentUserId={user?.id} typingUserIds={typingUserIds} />
          <ChatComposer
            onSendMessage={handleSendMessage}
            onTypingChange={
              chatroomId
                ? (isTyping) => setTyping(chatroomId, isTyping)
                : undefined
            }
            isCompact={isCompact}
          />
        </div>
      )}
    </aside>
  );
}
