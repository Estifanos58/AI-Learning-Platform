import { cookies } from 'next/headers';
import { UserProfile } from '@/src/lib/types';
import { API_BASE_URL } from '@/src/lib/api/gateway-core';

export async function getServerAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('app_access_token')?.value ?? null;
}

export async function gatewayServerGet<T>(
  path: string,
  options?: { token?: string | null; revalidateSeconds?: number; tags?: string[] }
): Promise<T | null> {
  const token = options?.token ?? (await getServerAccessToken());
  if (!token) return null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    next: {
      revalidate: options?.revalidateSeconds ?? 60,
      tags: options?.tags ?? [],
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export async function getServerProfile(token?: string | null): Promise<UserProfile | null> {
  return gatewayServerGet<UserProfile>('/profile/me', {
    token,
    revalidateSeconds: 0,
    tags: ['profile-me'],
  });
}

export function isProfileComplete(profile: Pick<UserProfile, 'firstName' | 'lastName'> | null): boolean {
  return Boolean(profile?.firstName?.trim() && profile?.lastName?.trim());
}
