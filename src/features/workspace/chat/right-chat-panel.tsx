'use client';

import { useEffect, useState } from 'react';
import { ChatMessage as ChatMessageType, Chatroom } from '@/src/lib/types';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '../workspace-context';
import { useGatewayChat } from '@/src/hooks/use-gateway';
import { ChatHeader } from './chat-header';
import { ChatMessageList } from './chat-message-list';
import { ChatComposer } from './chat-composer';
import { LoadingState, EmptyState } from '@/src/components/common/states';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RightChatPanelProps {
  isOpen: boolean;
}

export function RightChatPanel({ isOpen }: RightChatPanelProps) {
  const { user, session } = useAuth();
  const { selectedFileId, chatroomId, setChatroomId, rightSidebarWidth } = useWorkspace();
  const [chatroom, setChatroom] = useState<Chatroom | null>(null);
  const [models, setModels] = useState<{ id: string; name: string; provider: string; description: string }[]>([]);
  const { messages, isLoading: isMessagesLoading, refreshMessages, sendMessage, getModels, createChatroomForFileMockFallback } = useGatewayChat(
    session?.accessToken,
    chatroomId
  );
  const [isLoading, setIsLoading] = useState(false);

  const isCompact = rightSidebarWidth < 320; // Mobile-like breakpoint


  // Initialize chatroom when file changes
  useEffect(() => {
    const initializeChatroom = async () => {
      if (!user?.id || !selectedFileId) {
        setChatroom(null);
        setChatroomId(null);
        return;
      }

      setIsLoading(true);
      try {
        // No backend endpoint exists for "create chatroom for file", so keep mock fallback for this specific flow.
        const newChatroom = await createChatroomForFileMockFallback(user.id, selectedFileId);
        setChatroom(newChatroom);
        setChatroomId(newChatroom.id);
      } catch (err) {
        console.error('Failed to initialize chatroom:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChatroom();
  }, [user?.id, selectedFileId, setChatroomId, createChatroomForFileMockFallback]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const availableModels = await getModels();
        setModels(availableModels);
      } catch {
        setModels([]);
      }
    };

    loadModels();
  }, [getModels]);

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
        setChatroom((prev) =>
          prev && prev.id === response.chatroomId
            ? prev
            : {
                id: response.chatroomId,
                type: 'DOCUMENT_CONTEXT',
                memberIds: [user.id],
                contextFileId: selectedFileId ?? undefined,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
        );
        setChatroomId(response.chatroomId);
      }

      await refreshMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="w-full h-full border-l border-border bg-card flex flex-col overflow-hidden">
      {isLoading && !chatroom ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingState text="Loading chat..." />
        </div>
      ) : !selectedFileId ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <EmptyState
            icon="💬"
            title="Select a file"
            description="Open a document to start chatting"
          />
        </div>
      ) : chatroom ? (
        <div className={cn("flex flex-col h-full", isCompact && "text-xs")}>
          <ChatHeader chatroom={chatroom} isCompact={isCompact} />
          <ChatMessageList messages={messages} isCompact={isCompact} />
          <ChatComposer onSendMessage={handleSendMessage} isCompact={isCompact} models={models} />
        </div>
      ) : null}
    </aside>
  );
}
