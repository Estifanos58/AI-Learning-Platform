'use client';

import useSWR from 'swr';
import { gatewayApi } from '@/src/lib/api/gateway';

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
