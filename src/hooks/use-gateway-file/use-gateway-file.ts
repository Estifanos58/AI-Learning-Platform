'use client';

import useSWR from 'swr';
import { gatewayApi } from '@/src/lib/api/gateway';

export function useGatewayFile(token?: string | null, fileId?: string | null) {
  const shouldFetch = Boolean(token && fileId);

  const query = useSWR(
    shouldFetch ? ['file', token, fileId] : null,
    () => gatewayApi.files.getFile(token as string, fileId as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
      keepPreviousData: true,
    }
  );

  return {
    file: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: query.mutate,
  };
}
