'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AIModel, Chatroom, UserProfile } from '@/src/lib/types';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '../workspace-context';
import { useGatewayChat, useGatewayProfile } from '@/src/hooks/use-gateway';
import { ChatHeader } from './chat-header';
import { ChatMessageList } from './chat-message-list';
import { ChatComposer } from './chat-composer';
import { EmptyState } from '@/src/components/common/states';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, Loader2, MessageCircle, Search, UserRound } from 'lucide-react';
import { toast } from 'sonner';

interface RightChatPanelProps {
  isOpen: boolean;
}

export function RightChatPanel({ isOpen }: RightChatPanelProps) {
  const { user, session } = useAuth();
  const { chatroomId, setChatroomId, draftOtherUserId, setDraftOtherUserId, rightSidebarWidth } = useWorkspace();
  const [chatroom, setChatroom] = useState<Chatroom | null>(null);
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [isChatroomsLoading, setIsChatroomsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDeferredValue(searchTerm.trim());
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const {
    messages,
    sendMessage,
    getChatroom,
    listChatrooms,
    listAiModels,
    setTyping,
    isSocketConnected,
    typingUserIds,
  } = useGatewayChat(
    session?.accessToken,
    chatroomId,
    {
      subscribedChatroomIds: chatrooms.map((room) => room.id),
      onNewChatroom: (event) => {
        const newChatroomId = event?.data?.chatroomId;
        if (!newChatroomId) return;

        setChatrooms((previous) => {
          if (previous.some((room) => room.id === newChatroomId)) {
            return previous;
          }

          return [
            {
              id: newChatroomId,
              type: event.data.otherUserId ? 'DM' : 'DOCUMENT_CONTEXT',
              memberIds: [user?.id, event.data.otherUserId].filter((id): id is string => Boolean(id)),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...previous,
          ];
        });
      },
    },
  );
  const { searchProfiles, getByUserId } = useGatewayProfile(session?.accessToken);

  const isCompact = rightSidebarWidth < 320; // Mobile-like breakpoint
  const hasActiveConversation = Boolean(chatroomId || draftOtherUserId);

  const cacheDisplayName = (userId: string, profile?: Pick<UserProfile, 'firstName' | 'lastName'>) => {
    if (!userId || !profile) return;

    const resolvedName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    if (!resolvedName) return;

    setDisplayNames((previous) => {
      if (previous[userId] === resolvedName) {
        return previous;
      }

      return {
        ...previous,
        [userId]: resolvedName,
      };
    });
  };

  const resolveOtherUserId = (room: Chatroom | null): string | null => {
    if (!room || room.type !== 'DM') return null;
    const otherId = room.memberIds.find((memberId) => memberId !== user?.id);
    return otherId ?? null;
  };

  const activeOtherUserId = useMemo(() => {
    if (draftOtherUserId) return draftOtherUserId;
    return resolveOtherUserId(chatroom);
  }, [chatroom, draftOtherUserId]);

  const activeChatTitle = useMemo(() => {
    if (draftOtherUserId) {
      return displayNames[draftOtherUserId] || 'New direct message';
    }

    if (!chatroom) return 'Conversation';

    if (chatroom.type === 'DM') {
      const otherUserId = resolveOtherUserId(chatroom);
      if (otherUserId && displayNames[otherUserId]) {
        return displayNames[otherUserId];
      }
      return chatroom.name || 'Direct message';
    }

    return chatroom.name || 'AI Assistant';
  }, [chatroom, displayNames, draftOtherUserId]);

  const activeChatSubtitle = useMemo(() => {
    if (chatroom?.type === 'DM' || draftOtherUserId) {
      return isSocketConnected ? 'Direct message' : 'Reconnecting...';
    }

    return isSocketConnected ? 'Realtime connected' : 'Realtime reconnecting...';
  }, [chatroom?.type, draftOtherUserId, isSocketConnected]);

  const activeChatInitial = useMemo(() => {
    const title = activeChatTitle.trim();
    if (!title) return 'C';
    return title.charAt(0).toUpperCase();
  }, [activeChatTitle]);

  useEffect(() => {
    const loadChatrooms = async () => {
      if (!session?.accessToken) {
        setChatrooms([]);
        return;
      }

      setIsChatroomsLoading(true);
      try {
        const data = await listChatrooms();
        setChatrooms(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load chatrooms');
      } finally {
        setIsChatroomsLoading(false);
      }
    };

    loadChatrooms();
  }, [session?.accessToken, listChatrooms]);

  useEffect(() => {
    const loadAiModels = async () => {
      if (!session?.accessToken) {
        setAiModels([]);
        return;
      }

      try {
        const models = await listAiModels();
        setAiModels(models);
      } catch {
        setAiModels([]);
      }
    };

    loadAiModels();
  }, [session?.accessToken, listAiModels]);

  useEffect(() => {
    const query = debouncedSearchTerm;
    if (!session?.accessToken || !query) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      setIsSearchingUsers(true);
      try {
        const response = await searchProfiles({ nameQuery: query, page: 0, size: 10 });
        if (!cancelled) {
          setSearchResults(response.profiles);
          response.profiles.forEach((profile) => cacheDisplayName(profile.userId, profile));
        }
      } catch (err) {
        if (!cancelled) {
          setSearchResults([]);
          toast.error(err instanceof Error ? err.message : 'Failed to search users');
        }
      } finally {
        if (!cancelled) {
          setIsSearchingUsers(false);
        }
      }
    };

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearchTerm, searchProfiles, session?.accessToken]);

  useEffect(() => {
    const preloadDmNames = async () => {
      if (!session?.accessToken || chatrooms.length === 0 || !user?.id) return;

      const dmOtherUserIds = chatrooms
        .filter((room) => room.type === 'DM')
        .map((room) => room.memberIds.find((memberId) => memberId !== user.id))
        .filter((memberId): memberId is string => Boolean(memberId));

      const missingIds = dmOtherUserIds.filter((memberId) => !displayNames[memberId]).slice(0, 10);
      if (missingIds.length === 0) return;

      await Promise.all(
        missingIds.map(async (memberId) => {
          try {
            const profile = await getByUserId(memberId);
            cacheDisplayName(memberId, profile);
          } catch {
            // ignore profile lookup errors
          }
        }),
      );
    };

    preloadDmNames();
  }, [chatrooms, displayNames, getByUserId, session?.accessToken, user?.id]);

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

  useEffect(() => {
    const loadDraftUserProfile = async () => {
      if (!draftOtherUserId || displayNames[draftOtherUserId]) return;

      try {
        const profile = await getByUserId(draftOtherUserId);
        cacheDisplayName(draftOtherUserId, profile);
      } catch {
        // ignore
      }
    };

    loadDraftUserProfile();
  }, [displayNames, draftOtherUserId, getByUserId]);

  const handleSendMessage = async (content: string, aiModelId?: string, attachedFileIds: string[] = []) => {
    if (!user?.id) return;

    if (!chatroomId && !draftOtherUserId) {
      toast.error('Open a conversation first to send messages or attach files');
      return;
    }

    const sanitizedContent = content.trim();
    const fileIds = attachedFileIds.filter(Boolean);

    if (!sanitizedContent && fileIds.length === 0) {
      return;
    }

    try {
      let resolvedChatroomId = chatroom?.id ?? chatroomId ?? undefined;

      const sendOne = async (input: { content?: string; fileId?: string }, allowOtherUser = false) =>
        sendMessage({
          chatroomId: resolvedChatroomId,
          otherUserId: allowOtherUser ? draftOtherUserId ?? undefined : undefined,
          content: input.content,
          fileId: input.fileId,
          aiModelId,
        });

      if (fileIds.length === 0) {
        const response = await sendOne({ content: sanitizedContent || undefined }, true);
        resolvedChatroomId = response.chatroomId;
      } else {
        const firstResponse = await sendOne(
          { content: sanitizedContent || undefined, fileId: fileIds[0] },
          true,
        );
        resolvedChatroomId = firstResponse.chatroomId;

        for (const fileId of fileIds.slice(1)) {
          await sendOne({ fileId }, false);
        }
      }

      if (resolvedChatroomId && resolvedChatroomId !== chatroomId) {
        setChatroomId(resolvedChatroomId);
        setDraftOtherUserId(null);

        try {
          const room = await getChatroom(resolvedChatroomId);
          setChatroom(room);
        } catch {
          setChatroom((prev) =>
            prev && prev.id === resolvedChatroomId
              ? prev
              : {
                  id: resolvedChatroomId,
                  type: draftOtherUserId ? 'DM' : 'DOCUMENT_CONTEXT',
                  memberIds: draftOtherUserId ? [user.id, draftOtherUserId] : [user.id],
                  createdAt: new Date().toISOString(),
                },
          );
        }
      }

      const refreshedChatrooms = await listChatrooms();
      setChatrooms(refreshedChatrooms);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const openDraftDm = (profile: UserProfile) => {
    cacheDisplayName(profile.userId, profile);
    setChatroomId(null);
    setDraftOtherUserId(profile.userId);
    setChatroom({
      id: `draft-${profile.userId}`,
      type: 'DM',
      memberIds: user?.id ? [user.id, profile.userId] : [profile.userId],
      name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'New direct message',
      createdAt: new Date().toISOString(),
    });
  };

  const openChatroom = (room: Chatroom) => {
    setDraftOtherUserId(null);
    setChatroomId(room.id);
  };

  const closeConversation = () => {
    setChatroom(null);
    setChatroomId(null);
    setDraftOtherUserId(null);
  };

  const showSearchResults = debouncedSearchTerm.length > 0;

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="w-full h-full border-l border-border bg-card flex flex-col overflow-hidden">
      {!hasActiveConversation ? (
        <div className="flex h-full flex-col">
          <div className="border-b border-border/50 bg-background/50 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search users"
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {showSearchResults ? (
              isSearchingUsers ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching users...
                </div>
              ) : searchResults.length === 0 ? (
                <EmptyState
                  icon="🔎"
                  title="No users found"
                  description="Try another name"
                />
              ) : (
                <div className="space-y-1">
                  {searchResults.map((profile) => {
                    const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Unnamed user';
                    return (
                      <div
                        key={profile.userId}
                        className="group flex items-center justify-between rounded-md border border-transparent px-2 py-2 hover:bg-accent/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{profile.department || profile.universityId || profile.userId}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openDraftDm(profile)}
                          aria-label="Start message"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : isChatroomsLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading chatrooms...
              </div>
            ) : chatrooms.length === 0 ? (
              <EmptyState
                icon="💬"
                title="No chatrooms yet"
                description="Search for users to start a direct message"
              />
            ) : (
              <div className="space-y-1">
                {chatrooms.map((room) => {
                  const otherUserId = room.type === 'DM'
                    ? room.memberIds.find((memberId) => memberId !== user?.id)
                    : null;

                  const roomTitle = room.type === 'DM'
                    ? (otherUserId ? displayNames[otherUserId] : null) || room.name || 'Direct message'
                    : room.name || 'AI Assistant';

                  return (
                    <button
                      type="button"
                      key={room.id}
                      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-accent/50"
                      onClick={() => openChatroom(room)}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {roomTitle.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{roomTitle}</p>
                          <p className="truncate text-xs text-muted-foreground">{room.type === 'DM' ? 'Direct message' : room.type}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={cn('flex h-full', isCompact && 'text-xs')}>
          <div className="flex w-16 shrink-0 flex-col items-center border-r border-border/50 bg-background/60 pt-4">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
              {activeChatInitial}
            </div>
            {chatroom?.type === 'DM' || draftOtherUserId ? (
              <UserRound className="mt-3 h-4 w-4 text-muted-foreground" />
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <ChatHeader
              chatroom={chatroom}
              isCompact={isCompact}
              isSocketConnected={isSocketConnected}
              title={activeChatTitle}
              subtitle={activeChatSubtitle}
              onBack={closeConversation}
            />
            <ChatMessageList messages={messages} isCompact={isCompact} currentUserId={user?.id} typingUserIds={typingUserIds} />
            <ChatComposer
              onSendMessage={handleSendMessage}
              onTypingChange={
                chatroomId
                  ? async (isTyping) => {
                      await setTyping(chatroomId, isTyping);
                    }
                  : undefined
              }
              isCompact={isCompact}
              allowFileDrop={hasActiveConversation}
              models={chatroom?.type === 'DM' || draftOtherUserId ? [] : aiModels}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
