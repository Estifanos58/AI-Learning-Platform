'use client';

import useSWR from 'swr';
import { gatewayApi } from '@/src/lib/api/gateway';

export function useAiModels(token?: string | null) {
  const shouldFetch = Boolean(token);

  const { data, isLoading, error } = useSWR(
    shouldFetch ? ['ai-models', token] : null,
    () => gatewayApi.chat.listAiModels(token as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  return {
    aiModels: data ?? [],
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
