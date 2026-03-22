'use client';

import useSWR from 'swr';
import { useMemo, useCallback } from 'react';
import { gatewayApi } from '@/src/lib/api/gateway';
import { ProfileVisibility } from '@/src/lib/types';

export function useGatewayProfile(token?: string | null) {
  const shouldFetch = Boolean(token);

  const query = useSWR(
    shouldFetch ? ['profile-me', token] : null,
    () => gatewayApi.profile.getMe(token as string),
    {
      revalidateOnFocus: true,
      dedupingInterval: 15_000,
    }
  );

  const refresh = query.mutate;

  const updateProfile = useCallback(async (input: {
    firstName?: string;
    lastName?: string;
    universityId?: string;
    department?: string;
    bio?: string;
    profileImageFileId?: string;
  }) => {
    if (!token) throw new Error('Not authenticated');
    const updated = await gatewayApi.profile.updateMe(token, input);
    await query.mutate(updated, { revalidate: false });
    return updated;
  }, [query, token]);

  const updateVisibility = useCallback(async (visibility: ProfileVisibility) => {
    if (!token) throw new Error('Not authenticated');
    await gatewayApi.profile.updateVisibility(token, visibility);
    await query.mutate();
  }, [query, token]);

  const getByUserId = useCallback(async (userId: string) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.profile.getByUserId(token, userId);
  }, [token]);

  const searchProfiles = useCallback(async (input: { nameQuery?: string; page?: number; size?: number }) => {
    if (!token) throw new Error('Not authenticated');
    return gatewayApi.profile.search(token, input);
  }, [token]);

  return useMemo(() => ({
    profile: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
    updateProfile,
    updateVisibility,
    getByUserId,
    searchProfiles,
  }), [getByUserId, query.data, query.error, query.isLoading, refresh, searchProfiles, updateProfile, updateVisibility]);
}
