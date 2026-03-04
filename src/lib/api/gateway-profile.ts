import { ProfileVisibility, UserProfile } from '@/src/lib/types';
import { apiRequest } from './gateway-core';
import { updateProfileSchema } from './gateway-schemas';

export const profileApi = {
  async getMe(token: string, options?: { revalidateSeconds?: number }): Promise<UserProfile> {
    const next = options?.revalidateSeconds ? { revalidate: options.revalidateSeconds, tags: ['profile-me'] } : undefined;
    return apiRequest<UserProfile>('/api/profile/me', { token, cache: 'force-cache', next });
  },

  async updateMe(token: string, input: {
    firstName?: string;
    lastName?: string;
    universityId?: string;
    department?: string;
    bio?: string;
    profileImageFileId?: string;
  }): Promise<UserProfile> {
    return apiRequest<UserProfile>('/api/profile/me', { method: 'PUT', token, body: updateProfileSchema.parse(input), cache: 'no-store' });
  },

  async updateVisibility(token: string, visibility: ProfileVisibility): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/api/profile/visibility', { method: 'PATCH', token, body: { visibility }, cache: 'no-store' });
  },
};
