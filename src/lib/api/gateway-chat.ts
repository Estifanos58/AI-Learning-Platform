import { ChatMessage, Chatroom } from '@/src/lib/types';
import { chatMockService } from '@/src/lib/mocks';
import { apiRequest } from './gateway-core';
import { sendMessageSchema } from './gateway-schemas';

export const chatApi = {
  async listChatrooms(token: string, page = 0, size = 20): Promise<Chatroom[]> {
    const res = await apiRequest<{ chatrooms: Chatroom[]; total: number }>(`/chat/chatrooms?page=${page}&size=${size}`, { token, cache: 'force-cache', next: { revalidate: 30, tags: ['chatrooms'] } });
    return res.chatrooms;
  },
  getChatroom: (token: string, chatroomId: string) => apiRequest<Chatroom>(`/chat/chatrooms/${chatroomId}`, { token, cache: 'force-cache', next: { revalidate: 30, tags: ['chatrooms', `chatroom-${chatroomId}`] } }),
  async listMessages(token: string, chatroomId: string, page = 0, size = 50): Promise<ChatMessage[]> {
    const res = await apiRequest<{ messages: ChatMessage[]; total: number }>(`/chat/chatrooms/${chatroomId}/messages?page=${page}&size=${size}`, { token, cache: 'force-cache', next: { revalidate: 15, tags: ['chat-messages', `chatroom-${chatroomId}`] } });
    return res.messages;
  },
  sendMessage: (
    token: string,
    input: { otherUserId?: string; chatroomId?: string; aiModelId?: string; content?: string; fileId?: string; fileBase64?: string; fileOriginalName?: string; fileContentType?: string }
  ) => apiRequest<{ message: ChatMessage; chatroomId: string; isNewChatroom: boolean }>('/chat/messages', { method: 'POST', token, body: sendMessageSchema.parse(input), cache: 'no-store' }),
  setTyping: (token: string, chatroomId: string, isTyping = true) => apiRequest<{ message: string }>(`/chat/chatrooms/${chatroomId}/typing?isTyping=${isTyping}`, { method: 'POST', token, cache: 'no-store' }),
  createChatroomForFile: (userId: string, fileId: string) => chatMockService.createChatroomForFile(userId, fileId),
  getModels: () => chatMockService.getAIModels(),
};
