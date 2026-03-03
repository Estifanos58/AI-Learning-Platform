'use client';

import { useEffect, useState } from 'react';
import { ChatMessage as ChatMessageType, Chatroom } from '@/src/lib/types';
import { chatMockService } from '@/src/lib/mocks';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '../workspace-context';
import { ChatHeader } from './chat-header';
import { ChatMessageList } from './chat-message-list';
import { ChatComposer } from './chat-composer';
import { LoadingState, EmptyState } from '@/src/components/common/states';
import { cn } from '@/lib/utils';

interface RightChatPanelProps {
  isOpen: boolean;
}

export function RightChatPanel({ isOpen }: RightChatPanelProps) {
  const { user } = useAuth();
  const { selectedFileId, chatroomId, setChatroomId, rightSidebarWidth } = useWorkspace();
  const [chatroom, setChatroom] = useState<Chatroom | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isCompact = rightSidebarWidth < 320; // Mobile-like breakpoint


  // Initialize chatroom when file changes
  useEffect(() => {
    const initializeChatroom = async () => {
      if (!user?.id || !selectedFileId) {
        setChatroom(null);
        setChatroomId(null);
        setMessages([]);
        return;
      }

      setIsLoading(true);
      try {
        // Try to get existing chatroom or create new one
        const newChatroom = await chatMockService.createChatroomForFile(user.id, selectedFileId);
        setChatroom(newChatroom);
        setChatroomId(newChatroom.id);

        // Load messages
        const initialMessages = await chatMockService.listMessages(user.id, newChatroom.id);
        setMessages(initialMessages);
      } catch (err) {
        console.error('Failed to initialize chatroom:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChatroom();
  }, [user?.id, selectedFileId, setChatroomId]);

  const handleSendMessage = async (content: string, aiModelId?: string) => {
    if (!user?.id || !chatroom) return;

    try {
      // Add user message immediately (optimistic update)
      const userMessage: ChatMessageType = {
        id: `msg-${Date.now()}`,
        chatroomId: chatroom.id,
        senderUserId: user.id,
        senderUsername: user.username,
        content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Send through service
      await chatMockService.sendMessage(user.id, {
        chatroomId: chatroom.id,
        content,
        aiModelId,
        fileId: selectedFileId,
      });

      // Reload messages after a delay to get AI response
      setTimeout(async () => {
        const updated = await chatMockService.listMessages(user.id, chatroom.id);
        setMessages(updated);
      }, 1000);
    } catch (err) {
      console.error('Failed to send message:', err);
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
          <ChatComposer onSendMessage={handleSendMessage} isCompact={isCompact} />
        </div>
      ) : null}
    </aside>
  );
}
