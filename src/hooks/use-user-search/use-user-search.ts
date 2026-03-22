'use client';

import useSWR from 'swr';
import { gatewayApi } from '@/src/lib/api/gateway';

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
