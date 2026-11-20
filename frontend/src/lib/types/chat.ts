/**
 * Gateway chat contracts
 */

export type ChatroomType = 'DM' | 'DIRECT' | 'GROUP' | 'AI' | 'DOCUMENT_CONTEXT';

export interface Chatroom {
  id: string;
  type: ChatroomType;
  memberIds: string[];
  name?: string;
  createdAt: string;
  updatedAt?: string;
  otherUserId?: string | null;
  otherUserName?: string | null;
  otherUserProfileImageFileId?: string | null;
}

export interface ChatMessage {
  id: string;
  chatroomId: string;
  senderUserId: string;
  aiModelId?: string;
  content: string;
  fileId?: string;
  createdAt: string;
  isLoading?: boolean;
}

export interface SendMessageRequest {
  otherUserId?: string;
  chatroomId?: string;
  content?: string;
  aiModelId?: string;
  fileId?: string;
  fileOriginalName?: string;
  fileContentType?: string;
  fileBase64?: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  chatroomId: string;
  isNewChatroom: boolean;
}

export interface ListChatroomsResponse {
  chatrooms: Chatroom[];
  total: number;
}

export interface ListMessagesResponse {
  messages: ChatMessage[];
  total: number;
}

export interface DirectChatroomResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ListDirectChatroomsResponse {
  chatrooms: DirectChatroomResponse[];
  total: number;
}

export interface DirectChatMessageResponse {
  id: string;
  chatroomId: string;
  role: 'USER' | 'ASSISTANT' | string;
  content: string;
  status?: 'STREAMING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | string;
  createdAt: string;
  updatedAt?: string;
}

export interface ListDirectChatMessagesResponse {
  messages: DirectChatMessageResponse[];
  total: number;
}

export interface DirectChatroomDetailResponse extends DirectChatroomResponse {
  messages: DirectChatMessageResponse[];
}

export interface UpdateChatroomTitleRequest {
  title: string;
}

export interface ApiMessageResponse {
  status: string;
}

export interface TypingPayload {
  userId: string;
  chatroomId: string;
  isTyping: boolean;
}

export interface NewMessageEvent {
  type: 'newMessage';
  chatroomId: string;
  data: {
    message: ChatMessage;
    chatroomId: string;
    userId: string;
    fileId?: string;
  };
}

export interface NewChatroomEvent {
  type: 'newChatroom';
  userId: string;
  data: {
    message?: ChatMessage;
    chatroomId: string;
    otherUserId?: string;
    userId?: string;
    fileId?: string;
  };
}

export interface TypingEvent {
  type: 'typing';
  chatroomId: string;
  data: TypingPayload;
}

export type AIExecutionMode = 'chat' | 'deep';

export type AIStreamEventType = 'AI_CHUNK' | 'AI_COMPLETED' | 'AI_FAILED' | 'AI_CANCELLED';

export interface AIStreamEvent {
  type: AIStreamEventType;
  chatroomId: string;
  data: {
    type: AIStreamEventType;
    chatroomId: string;
    messageId: string;
    sequence?: number;
    contentDelta?: string;
    content?: string;
    done?: boolean;
    error?: string;
  };
}

export type ChatRealtimeEvent = NewMessageEvent | NewChatroomEvent | TypingEvent | AIStreamEvent;

export interface AIModel {
  modelId: string;
  modelName: string;
  contextLength: number;
  supportsStreaming: boolean;
  userKeyConfigured: boolean;
  id: string;
  name: string;
  provider: string;
  family?: string;
  capabilitiesJson?: string;
  providerCount?: number;
  description?: string;
  platformKeyAvailable?: boolean;
  isDefault?: boolean;
  active?: boolean;
}

export interface AiModelCreateInput {
  modelName: string;
  family: string;
  contextLength?: number;
  capabilitiesJson?: string;
  active?: boolean;
}

export interface AiProvider {
  providerId: string;
  modelId: string;
  providerName: string;
  providerModelName: string;
  priority: number;
  active: boolean;
}

export interface AiProviderAttachInput {
  modelId: string;
  providerName: string;
  providerModelName: string;
  priority?: number;
  active?: boolean;
}

export interface AiProviderAccount {
  accountId: string;
  providerName: string;
  accountLabel: string;
  rateLimitPerMinute: number;
  dailyQuota: number;
  usedToday: number;
  lastUsedAt: string | null;
  lastResetAt: string | null;
  active: boolean;
  healthStatus: string;
}

export interface AiProviderAccountCreateInput {
  providerName: string;
  accountLabel: string;
  apiKey: string;
  rateLimitPerMinute: number;
  dailyQuota: number;
  active?: boolean;
}

export interface UpsertUserAiApiKeyInput {
  modelId: string;
  apiKey: string;
}

export interface UserAiApiKeyResponse {
  success: boolean;
  message?: string;
}
