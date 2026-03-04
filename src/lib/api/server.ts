import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:8080';

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
