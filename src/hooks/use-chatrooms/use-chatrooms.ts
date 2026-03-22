'use client';

import useSWR from 'swr';
import { gatewayApi } from '@/src/lib/api/gateway';

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
