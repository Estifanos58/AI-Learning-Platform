'use client';

import useSWR from 'swr';
import { gatewayApi } from '@/src/lib/api/gateway';

export function useUserProfile(token?: string | null, userId?: string | null) {
  const shouldFetch = Boolean(token && userId);

  const { data, isLoading, error } = useSWR(
    shouldFetch ? ['user-profile', token, userId] : null,
    () => gatewayApi.profile.getByUserId(token as string, userId as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  return {
    profile: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
