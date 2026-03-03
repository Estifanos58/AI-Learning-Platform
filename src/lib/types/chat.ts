/**
 * Chat Types
 * Typed mock contracts for chat and messages
 */

export interface Chatroom {
  id: string;
  type: 'DM' | 'GROUP' | 'DOCUMENT_CONTEXT';
  memberIds: string[];
  contextFileId?: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatroomId: string;
  senderUserId: string;
  senderUsername?: string;
  aiModelId?: string;
  content: string;
  fileId?: string;
  createdAt: string;
  isLoading?: boolean;
}

export interface SendMessageRequest {
  chatroomId: string;
  content: string;
  aiModelId?: string;
  fileId?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}
