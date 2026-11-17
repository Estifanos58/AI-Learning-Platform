'use client';

import useSWR from 'swr';
import { useMemo, useCallback, useState } from 'react';
import { gatewayApi } from '@/src/lib/api/gateway';
import { Chatroom, UserProfile } from '@/src/lib/types';

const isDirectChatroom = (room?: Chatroom | null) => room?.type === 'DIRECT' || room?.type === 'DM';

export function useDisplayNames(
  token?: string | null,
  userId?: string | null,
  chatrooms: Chatroom[] = []
) {
  const [cachedNames, setCachedNames] = useState<Record<string, string>>({});

  const dmOtherUserIds = useMemo(() => {
    if (!userId) return [];
    return chatrooms
      .filter((room) => isDirectChatroom(room))
      .map((room) => room.otherUserId ?? room.memberIds.find((id) => id !== userId))
      .filter((id): id is string => Boolean(id))
      .filter((id) => !cachedNames[id])
      .slice(0, 10);
  }, [chatrooms, userId, cachedNames]);

  useSWR(
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
