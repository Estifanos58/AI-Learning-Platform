'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '@/src/lib/types';
import { ChatMessageItem } from './chat-message-item';
import { EmptyState } from '@/src/components/common/states';
import { cn } from '@/lib/utils';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isCompact?: boolean;
}

export function ChatMessageList({ messages, isCompact }: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-2">
        <EmptyState
          icon="💭"
          title="No messages"
          description="Start a conversation"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex-1 overflow-y-auto w-full", isCompact ? "px-2 py-2 space-y-2" : "px-3 py-4 space-y-3")}>
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} isCompact={isCompact} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
