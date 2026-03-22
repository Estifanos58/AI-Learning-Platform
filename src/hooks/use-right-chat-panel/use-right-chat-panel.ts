'use client';

import { useDeferredValue, useMemo, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Chatroom, UserProfile } from '@/src/lib/types';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '@/src/features/workspace/workspace-context';
import { useGatewayChat, useGatewayProfile } from '@/src/hooks/use-gateway';
import {
  useChatrooms,
  useAiModels,
  useActiveChatroom,
  useUserSearch,
  useDisplayNames,
} from '@/src/hooks/use-chat-panel';

const isDirectChatroom = (room?: Chatroom | null) => room?.type === 'DIRECT' || room?.type === 'DM';

export function useRightChatPanel() {
  const { user, session } = useAuth();
  const {
    chatroomId,
    setChatroomId,
    draftOtherUserId,
    setDraftOtherUserId,
    rightSidebarWidth,
    selectedFileId,
    preferredAiModelId,
    setPreferredAiModelId,
    getChatroomAiModelId,
    setChatroomAiModelId,
  } = useWorkspace();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDeferredValue(searchTerm.trim());
  const [localChatroom, setLocalChatroom] = useState<Chatroom | null>(null);

  const { chatrooms, isLoading: isChatroomsLoading, refresh: refreshChatrooms } = useChatrooms(session?.accessToken);
  const { aiModels } = useAiModels(session?.accessToken);
  const { chatroom: fetchedChatroom, refresh: refreshChatroom } = useActiveChatroom(session?.accessToken, chatroomId);
  const { results: searchResults, isLoading: isSearchingUsers } = useUserSearch(session?.accessToken, debouncedSearchTerm);
  const { displayNames, cacheDisplayName, getDisplayName } = useDisplayNames(session?.accessToken, user?.id, chatrooms);

  const chatroom = fetchedChatroom || localChatroom;

  const {
    messages,
    sendMessage,
    setTyping,
    stopActiveAiStream,
    isAiStreaming,
    isSocketConnected,
    typingUserIds,
  } = useGatewayChat(
    session?.accessToken,
    chatroomId,
    {
      subscribedChatroomIds: chatrooms.map((room) => room.id),
      onNewChatroom: (event) => {
        const newChatroomId = event?.data?.chatroomId;
        if (newChatroomId) {
          refreshChatrooms();
        }
      },
    },
  );
  const { getByUserId } = useGatewayProfile(session?.accessToken);

  useEffect(() => {
    searchResults.forEach((profile) => cacheDisplayName(profile.userId, profile));
  }, [searchResults, cacheDisplayName]);

  useEffect(() => {
    if (!draftOtherUserId || displayNames[draftOtherUserId]) return;
    getByUserId(draftOtherUserId)
      .then((profile) => cacheDisplayName(draftOtherUserId, profile))
      .catch(() => {});
  }, [draftOtherUserId, displayNames, getByUserId, cacheDisplayName]);

  const currentAiModelId = useMemo(() => {
    const roomKey = chatroomId || (draftOtherUserId ? `draft-${draftOtherUserId}` : null);
    if (roomKey) {
      const roomModelId = getChatroomAiModelId(roomKey);
      if (roomModelId !== null) {
        return roomModelId;
      }
    }
    const isDirectChat = isDirectChatroom(chatroom) || Boolean(draftOtherUserId);
    return isDirectChat ? null : preferredAiModelId;
  }, [chatroomId, draftOtherUserId, chatroom, getChatroomAiModelId, preferredAiModelId]);

  const handleAiModelChange = useCallback((modelId: string | null) => {
    const roomKey = chatroomId || (draftOtherUserId ? `draft-${draftOtherUserId}` : null);
    if (roomKey) {
      setChatroomAiModelId(roomKey, modelId);
    }
    const isDirectChat = isDirectChatroom(chatroom) || Boolean(draftOtherUserId);
    if (!isDirectChat && modelId) {
      setPreferredAiModelId(modelId);
    }
  }, [chatroomId, draftOtherUserId, chatroom, setChatroomAiModelId, setPreferredAiModelId]);

  const isCompact = rightSidebarWidth < 320;
  const hasActiveConversation = Boolean(chatroomId || draftOtherUserId);

  const resolveOtherUserId = useCallback((room: Chatroom | null): string | null => {
    if (!room || !isDirectChatroom(room)) return null;
    return room.otherUserId ?? room.memberIds.find((memberId) => memberId !== user?.id) ?? null;
  }, [user?.id]);

  const activeChatTitle = useMemo(() => {
    if (draftOtherUserId) {
      return getDisplayName(draftOtherUserId) || 'New direct message';
    }
    if (!chatroom) return 'Conversation';
    if (isDirectChatroom(chatroom)) {
      if (chatroom.otherUserName) return chatroom.otherUserName;
      const otherUserId = resolveOtherUserId(chatroom);
      if (otherUserId) {
        const name = getDisplayName(otherUserId);
        if (name) return name;
      }
      return otherUserId || chatroom.otherUserId || chatroom.name || 'Direct message';
    }
    return chatroom.name || 'AI Assistant';
  }, [chatroom, draftOtherUserId, getDisplayName, resolveOtherUserId]);

  const activeChatSubtitle = useMemo(() => {
    if (isDirectChatroom(chatroom) || draftOtherUserId) {
      return isSocketConnected ? 'Direct message' : 'Reconnecting...';
    }
    return isSocketConnected ? 'Realtime connected' : 'Realtime reconnecting...';
  }, [chatroom, draftOtherUserId, isSocketConnected]);

  const activeChatInitial = useMemo(() => {
    const title = activeChatTitle.trim();
    return title ? title.charAt(0).toUpperCase() : 'C';
  }, [activeChatTitle]);

  const handleSendMessage = useCallback(async (content: string, aiModelId?: string, attachedFileIds: string[] = []) => {
    if (!user?.id) return;
    if (!chatroomId && !draftOtherUserId) {
      toast.error('Open a conversation first to send messages or attach files');
      return;
    }

    const sanitizedContent = content.trim();
    const fileIds = attachedFileIds.filter(Boolean);
    if (!sanitizedContent && fileIds.length === 0) return;


    const availableModelId = aiModels[0]?.id || aiModels[0]?.modelId;
    const isDirectChat = isDirectChatroom(chatroom) || draftOtherUserId;

    let resolvedAiModelId: string | undefined;
    if (isDirectChat) {
      resolvedAiModelId = aiModelId || undefined;
    } else {
      resolvedAiModelId = aiModelId || preferredAiModelId || availableModelId;
    }

    if (!isDirectChat && aiModels.length > 0 && !resolvedAiModelId) {
      toast.error('Select an AI model before sending a message');
      return;
    }

    // if (resolvedAiModelId) {
    //   const selectedModel = aiModels.find((model) => model.id === resolvedAiModelId || model.modelId === resolvedAiModelId);
    //   if (selectedModel && selectedModel.platformKeyAvailable === false && !selectedModel.userKeyConfigured) {
    //     toast.error('This model requires your API key before use');
    //     return;
    //   }
    // }

    try {
      let resolvedChatroomId = chatroom?.id ?? chatroomId ?? undefined;
      if (resolvedChatroomId?.startsWith('draft-')) {
        resolvedChatroomId = undefined;
      }
      const sendOne = async (input: { content?: string; fileId?: string }, allowOtherUser = false) =>
        sendMessage({
          chatroomId: resolvedChatroomId,
          otherUserId: allowOtherUser ? draftOtherUserId ?? undefined : undefined,
          content: input.content,
          fileId: input.fileId,
          aiModelId: resolvedAiModelId,
        });

      const shouldAttachSelectedFile =
        Boolean(resolvedAiModelId) &&
        !draftOtherUserId &&
        !resolvedChatroomId &&
        Boolean(selectedFileId) &&
        fileIds.length === 0;

      const computedFileIds = shouldAttachSelectedFile ? [selectedFileId as string] : fileIds;

      if (computedFileIds.length === 0) {
        const response = await sendOne({ content: sanitizedContent || undefined }, true);
        resolvedChatroomId = response.chatroomId;
      } else {
        const firstResponse = await sendOne({ content: sanitizedContent || undefined, fileId: computedFileIds[0] }, true);
        resolvedChatroomId = firstResponse.chatroomId;
        for (const fileId of computedFileIds.slice(1)) {
          await sendOne({ fileId }, false);
        }
      }

      if (resolvedChatroomId && resolvedChatroomId !== chatroomId) {
        setChatroomId(resolvedChatroomId);
        setDraftOtherUserId(null);
        setLocalChatroom({
          id: resolvedChatroomId,
          type: draftOtherUserId ? 'DIRECT' : 'DOCUMENT_CONTEXT',
          memberIds: draftOtherUserId ? [user.id, draftOtherUserId] : [user.id],
          createdAt: new Date().toISOString(),
        });
        refreshChatroom();
      }

      refreshChatrooms();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [user?.id, chatroomId, draftOtherUserId, chatroom, aiModels, preferredAiModelId, selectedFileId, sendMessage, setChatroomId, setDraftOtherUserId, refreshChatroom, refreshChatrooms]);

  const openDraftDm = useCallback((profile: UserProfile) => {
    cacheDisplayName(profile.userId, profile);
    setChatroomId(null);
    setDraftOtherUserId(profile.userId);
    setLocalChatroom({
      id: `draft-${profile.userId}`,
      type: 'DIRECT',
      memberIds: user?.id ? [user.id, profile.userId] : [profile.userId],
      name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'New direct message',
      createdAt: new Date().toISOString(),
    });
  }, [user?.id, setChatroomId, setDraftOtherUserId, cacheDisplayName]);

  const openChatroom = useCallback((room: Chatroom) => {
    setDraftOtherUserId(null);
    setChatroomId(room.id);
    setLocalChatroom(null);
  }, [setChatroomId, setDraftOtherUserId]);

  const closeConversation = useCallback(() => {
    setLocalChatroom(null);
    setChatroomId(null);
    setDraftOtherUserId(null);
  }, [setChatroomId, setDraftOtherUserId]);

  const showSearchResults = debouncedSearchTerm.length > 0;

  const onTypingChange = chatroomId ? (isTyping: boolean) => setTyping(chatroomId, isTyping) : undefined;

  return {
    userId: user?.id,
    searchTerm,
    setSearchTerm,
    showSearchResults,
    isSearchingUsers,
    searchResults,
    isChatroomsLoading,
    chatrooms,
    displayNames,
    openDraftDm,
    openChatroom,
    chatroom,
    isCompact,
    isSocketConnected,
    activeChatTitle,
    activeChatSubtitle,
    activeChatInitial,
    draftOtherUserId,
    messages,
    typingUserIds,
    aiModels,
    currentAiModelId,
    isAiStreaming,
    hasActiveConversation,
    closeConversation,
    handleSendMessage,
    stopActiveAiStream,
    handleAiModelChange,
    onTypingChange,
  };
}

export type RightChatPanelViewModel = ReturnType<typeof useRightChatPanel>;
