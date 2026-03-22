'use client';

import useSWR from 'swr';
import { useMemo, useCallback, useState } from 'react';
import { gatewayApi } from '@/src/lib/api/gateway';
import { AIModel, Chatroom, UserProfile } from '@/src/lib/types';

interface UseChatPanelDataOptions {
  token?: string | null;
  userId?: string | null;
  chatroomId?: string | null;
  draftOtherUserId?: string | null;
  searchQuery?: string;
}

const isDirectChatroom = (room?: Chatroom | null) => room?.type === 'DIRECT' || room?.type === 'DM';

export function useChatrooms(token?: string | null) {
  const shouldFetch = Boolean(token);

  const { data, isLoading, error, mutate } = useSWR(
    shouldFetch ? ['chatrooms', token] : null,
    () => gatewayApi.chat.listChatrooms(token as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  );

  return {
    chatrooms: data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  };
}

export function useAiModels(token?: string | null) {
  const shouldFetch = Boolean(token);

  const { data, isLoading, error } = useSWR(
    shouldFetch ? ['ai-models', token] : null,
    () => gatewayApi.chat.listAiModels(token as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000, // Cache AI models for 1 minute
    }
  );

  return {
    aiModels: data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

export function useActiveChatroom(token?: string | null, chatroomId?: string | null) {
  const shouldFetch = Boolean(token && chatroomId);

  const { data, isLoading, error, mutate } = useSWR(
    shouldFetch ? ['chatroom', token, chatroomId] : null,
    () => gatewayApi.chat.getChatroom(token as string, chatroomId as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5_000,
    }
  );

  return {
    chatroom: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  };
}

export function useUserSearch(token?: string | null, query?: string) {
  const shouldFetch = Boolean(token && query && query.trim().length > 0);

  const { data, isLoading, error } = useSWR(
    shouldFetch ? ['user-search', token, query] : null,
    async () => {
      const response = await gatewayApi.profile.search(token as string, {
        nameQuery: query as string,
        page: 0,
        size: 10,
      });
      return response.profiles;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 2_000,
    }
  );

  return {
    results: data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

export function useUserProfile(token?: string | null, userId?: string | null) {
  const shouldFetch = Boolean(token && userId);

  const { data, isLoading, error } = useSWR(
    shouldFetch ? ['user-profile', token, userId] : null,
    () => gatewayApi.profile.getByUserId(token as string, userId as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000, // Cache profiles for 1 minute
    }
  );

  return {
    profile: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

export function useDisplayNames(
  token?: string | null,
  userId?: string | null,
  chatrooms: Chatroom[] = []
) {
  const [cachedNames, setCachedNames] = useState<Record<string, string>>({});

  // Get all DM other user IDs that need profile loading
  const dmOtherUserIds = useMemo(() => {
    if (!userId) return [];
    return chatrooms
      .filter((room) => isDirectChatroom(room))
      .map((room) => room.otherUserId ?? room.memberIds.find((id) => id !== userId))
      .filter((id): id is string => Boolean(id))
      .filter((id) => !cachedNames[id])
      .slice(0, 10); // Limit to 10 at a time
  }, [chatrooms, userId, cachedNames]);

  // Fetch missing profiles
  const { data: profiles } = useSWR(
    token && dmOtherUserIds.length > 0 ? ['dm-profiles', token, dmOtherUserIds.join(',')] : null,
    async () => {
      const results = await Promise.allSettled(
        dmOtherUserIds.map((id) => gatewayApi.profile.getByUserId(token as string, id))
      );
      return results
        .filter((r): r is PromiseFulfilledResult<UserProfile> => r.status === 'fulfilled')
        .map((r) => r.value);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      onSuccess: (fetchedProfiles) => {
        const newNames: Record<string, string> = {};
        fetchedProfiles.forEach((profile) => {
          const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
          if (name) {
            newNames[profile.userId] = name;
          }
        });
        if (Object.keys(newNames).length > 0) {
          setCachedNames((prev) => ({ ...prev, ...newNames }));
        }
      },
    }
  );

  const cacheDisplayName = useCallback((profileUserId: string, profile?: Pick<UserProfile, 'firstName' | 'lastName'>) => {
    if (!profileUserId || !profile) return;
    const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    if (!name) return;
    setCachedNames((prev) => prev[profileUserId] === name ? prev : { ...prev, [profileUserId]: name });
  }, []);

  const getDisplayName = useCallback((profileUserId: string) => {
    return cachedNames[profileUserId] || null;
  }, [cachedNames]);

  return {
    displayNames: cachedNames,
    cacheDisplayName,
    getDisplayName,
  };
}
