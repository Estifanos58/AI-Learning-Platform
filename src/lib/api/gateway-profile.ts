import { ProfileVisibility, UserProfile } from '@/src/lib/types';
import { apiRequest } from './gateway-core';
import { updateProfileSchema } from './gateway-schemas';

export const profileApi = {
  async getMe(token: string, options?: { revalidateSeconds?: number }): Promise<UserProfile> {
    const next = options?.revalidateSeconds ? { revalidate: options.revalidateSeconds, tags: ['profile-me'] } : undefined;
    return apiRequest<UserProfile>('/profile/me', { token, cache: 'no-store', next });
  },

  async updateMe(token: string, input: {
    firstName?: string;
    lastName?: string;
    universityId?: string;
    department?: string;
    bio?: string;
    profileImageFileId?: string;
  }): Promise<UserProfile> {
    return apiRequest<UserProfile>('/profile/me', { method: 'PUT', token, body: updateProfileSchema.parse(input), cache: 'no-store' });
  },

  async updateVisibility(token: string, visibility: ProfileVisibility): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/profile/visibility', { method: 'PATCH', token, body: { visibility }, cache: 'no-store' });
  },

  async getByUserId(token: string, userId: string): Promise<UserProfile> {
    return apiRequest<UserProfile>(`/profile/${encodeURIComponent(userId)}`, {
      token,
      cache: 'no-store',
    });
  },

  async search(token: string, input: { nameQuery?: string; page?: number; size?: number }): Promise<{ profiles: UserProfile[]; total: number }> {
    const params = new URLSearchParams();

    if (input.nameQuery?.trim()) {
      params.set('nameQuery', input.nameQuery.trim());
    }

    params.set('page', String(input.page ?? 0));
    params.set('size', String(input.size ?? 20));

    return apiRequest<{ profiles: UserProfile[]; total: number }>(`/profile/search?${params.toString()}`, {
      token,
      cache: 'no-store',
    });
  },
};
