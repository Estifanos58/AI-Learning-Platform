import { cookies } from 'next/headers';
import { UserProfile } from '@/src/lib/types';
import { getServerApiBaseUrl, API_BASE_URL } from '@/src/lib/api/gateway-core';

export async function getServerAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('app_access_token')?.value ?? null;
}

export async function hasServerAuthCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(
    cookieStore.get('app_access_token')?.value || cookieStore.get('app_refresh_token')?.value,
  );
}

export async function gatewayServerGet<T>(
  path: string,
  options?: { token?: string | null; revalidateSeconds?: number; tags?: string[] }
): Promise<T | null> {
  try {
    const token = options?.token ?? (await getServerAccessToken());
    if (!token) return null;

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const configuredBaseUrl = getServerApiBaseUrl();

    try {
      const response = await fetch(`${configuredBaseUrl}${normalizedPath}`, {
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
    } catch (primaryErr) {
      // Fallback if running inside Docker container where localhost:8080 is unreachable, or vice versa
      const fallbackBaseUrl = configuredBaseUrl.includes('api-gateway')
        ? 'http://localhost:8080/api'
        : configuredBaseUrl.includes('localhost')
          ? 'http://api-gateway:8080/api'
          : null;

      if (fallbackBaseUrl && fallbackBaseUrl !== configuredBaseUrl) {
        try {
          const fallbackResponse = await fetch(`${fallbackBaseUrl}${normalizedPath}`, {
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

          if (!fallbackResponse.ok) {
            return null;
          }

          return (await fallbackResponse.json()) as T;
        } catch (fallbackErr) {
          console.warn(`[gatewayServerGet] Fallback server fetch failed for ${path}:`, fallbackErr);
          return null;
        }
      }

      console.warn(`[gatewayServerGet] Server fetch failed for ${path}:`, primaryErr);
      return null;
    }
  } catch (err) {
    console.warn(`[gatewayServerGet] Unexpected error in server fetch for ${path}:`, err);
    return null;
  }
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
