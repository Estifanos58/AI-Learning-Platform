/**
 * Mock Chat Service
 * Simulates chat and messaging operations
 */

import { AIModel, Chatroom, ChatMessage, SendMessageRequest } from '@/src/lib/types';

const MOCK_DELAY = 300;

// In-memory store
const chatrooms = new Map<string, Chatroom>();
const messages = new Map<string, ChatMessage[]>();

// AI Models
export const AVAILABLE_AI_MODELS: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    description: 'Most capable model',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: 'Fast and efficient',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Advanced reasoning',
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function initializeMockData() {
  if (chatrooms.size > 0) return;

  const chatroomId = 'chatroom-1';
  const chatroom: Chatroom = {
    id: chatroomId,
    type: 'DOCUMENT_CONTEXT',
    memberIds: ['user-1'],
    contextFileId: 'file-1',
    name: 'Document Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  chatrooms.set(chatroomId, chatroom);

  // Initialize messages
  const initialMessages: ChatMessage[] = [
    {
      id: generateId('msg'),
      chatroomId,
      senderUserId: 'ai-assistant',
      senderUsername: 'NotebookLM',
      aiModelId: 'gpt-4',
      content:
        'Hello! I\'ve loaded your document "Machine Learning Basics.pdf". Feel free to ask me any questions about its content.',
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
  ];

  messages.set(chatroomId, initialMessages);
}

export const chatMockService = {
  async sendMessage(userId: string, request: SendMessageRequest): Promise<ChatMessage> {
    await delay(MOCK_DELAY);
    initializeMockData();

    const chatroom = chatrooms.get(request.chatroomId);
    if (!chatroom) {
      throw new Error('Chatroom not found');
    }

    if (!request.content || request.content.trim().length === 0) {
      throw new Error('Message content is required');
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId('msg'),
      chatroomId: request.chatroomId,
      senderUserId: userId,
      senderUsername: 'You',
      content: request.content.trim(),
      fileId: request.fileId,
      createdAt: new Date().toISOString(),
    };

    let chatroomMessages = messages.get(request.chatroomId) || [];
    chatroomMessages.push(userMessage);

    // Simulate AI response after a slight delay
    setTimeout(async () => {
      const aiResponse: ChatMessage = {
        id: generateId('msg'),
        chatroomId: request.chatroomId,
        senderUserId: 'ai-assistant',
        senderUsername: 'NotebookLM',
        aiModelId: request.aiModelId || 'gpt-4',
        content: `Thanks for the question about "${request.content.substring(0, 30)}...". This is a simulated response. In the real app, this would be powered by the selected AI model.`,
        createdAt: new Date(Date.now() + 500).toISOString(),
      };

      chatroomMessages.push(aiResponse);
      messages.set(request.chatroomId, chatroomMessages);
    }, 800);

    messages.set(request.chatroomId, chatroomMessages);
    return userMessage;
  },

  async listChatrooms(userId: string): Promise<Chatroom[]> {
    await delay(MOCK_DELAY);
    initializeMockData();

    return Array.from(chatrooms.values())
      .filter((c) => c.memberIds.includes(userId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async getChatroom(userId: string, chatroomId: string): Promise<Chatroom> {
    await delay(MOCK_DELAY);
    initializeMockData();

    const chatroom = chatrooms.get(chatroomId);
    if (!chatroom || !chatroom.memberIds.includes(userId)) {
      throw new Error('Chatroom not found or access denied');
    }

    return chatroom;
  },

  async listMessages(userId: string, chatroomId: string): Promise<ChatMessage[]> {
    await delay(MOCK_DELAY);
    initializeMockData();

    const chatroom = chatrooms.get(chatroomId);
    if (!chatroom || !chatroom.memberIds.includes(userId)) {
      throw new Error('Chatroom not found or access denied');
    }

    return messages.get(chatroomId) || [];
  },

  async setTyping(chatroomId: string, userId: string, isTyping: boolean): Promise<{ message: string }> {
    await delay(100);

    // Mock: In real app, would broadcast typing status via WebSocket
    return { message: isTyping ? 'User is typing...' : 'User stopped typing' };
  },

  async getAIModels(): Promise<AIModel[]> {
    await delay(MOCK_DELAY);
    return AVAILABLE_AI_MODELS;
  },

  async createChatroomForFile(userId: string, fileId: string): Promise<Chatroom> {
    await delay(MOCK_DELAY);

    const chatroomId = generateId('chatroom');
    const chatroom: Chatroom = {
      id: chatroomId,
      type: 'DOCUMENT_CONTEXT',
      memberIds: [userId],
      contextFileId: fileId,
      name: 'Document Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    chatrooms.set(chatroomId, chatroom);
    messages.set(chatroomId, []);

    return chatroom;
  },
};
