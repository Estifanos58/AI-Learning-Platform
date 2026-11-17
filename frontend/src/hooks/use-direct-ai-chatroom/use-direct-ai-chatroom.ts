'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { gatewayApi, GatewayApiError } from '@/src/lib/api/gateway';
import type { DirectChatroomResponse } from '@/src/lib/types';

function sortByLastUpdateDesc(chatrooms: DirectChatroomResponse[]): DirectChatroomResponse[] {
  return [...chatrooms].sort((a, b) => {
    const aTs = new Date(a.updatedAt || a.createdAt).getTime();
    const bTs = new Date(b.updatedAt || b.createdAt).getTime();
    return bTs - aTs;
  });
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof GatewayApiError && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useDirectAIChatroom(token?: string | null) {
  const shouldFetch = Boolean(token);
  const [updatingChatroomId, setUpdatingChatroomId] = useState<string | null>(null);
  const [deletingChatroomId, setDeletingChatroomId] = useState<string | null>(null);

  const { data, isLoading, error, mutate } = useSWR(
    shouldFetch ? ['direct-chatrooms', token] : null,
    () => gatewayApi.chat.listDirectChatrooms(token as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  );

  const chatrooms = useMemo(() => sortByLastUpdateDesc(data ?? []), [data]);

  const renameChatroom = useCallback(async (chatroomId: string, title: string) => {
    if (!token) throw new Error('Not authenticated');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error('Title is required');
    }

    setUpdatingChatroomId(chatroomId);
    const previous = data ?? [];

    try {
      const optimistic = previous.map((room) =>
        room.id === chatroomId
          ? {
              ...room,
              title: trimmedTitle,
              updatedAt: new Date().toISOString(),
            }
          : room
      );

      await mutate(optimistic, false);
      const updated = await gatewayApi.chat.updateDirectChatroomTitle(token, chatroomId, { title: trimmedTitle });

      await mutate(
        (current) => {
          if (!current) return [updated];
          return current.map((room) => (room.id === chatroomId ? updated : room));
        },
        false
      );

      await mutate();
      return updated;
    } catch (error) {
      await mutate(previous, false);
      throw new Error(normalizeErrorMessage(error, 'Failed to rename chat'));
    } finally {
      setUpdatingChatroomId(null);
    }
  }, [data, mutate, token]);

  const deleteChatroom = useCallback(async (chatroomId: string) => {
    if (!token) throw new Error('Not authenticated');

    setDeletingChatroomId(chatroomId);
    const previous = data ?? [];

    try {
      const optimistic = previous.filter((room) => room.id !== chatroomId);
      await mutate(optimistic, false);
      await gatewayApi.chat.deleteDirectChatroom(token, chatroomId);
      await mutate();
    } catch (error) {
      await mutate(previous, false);
      throw new Error(normalizeErrorMessage(error, 'Failed to delete chat'));
    } finally {
      setDeletingChatroomId(null);
    }
  }, [data, mutate, token]);

  return {
    chatrooms,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
    renameChatroom,
    deleteChatroom,
    updatingChatroomId,
    deletingChatroomId,
  };
}
