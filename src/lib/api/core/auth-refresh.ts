import type { AuthSession } from '@/src/lib/types';
import { API_BASE_URL } from './config';
import { createCorrelationId } from './helpers';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setAuthCookies(accessToken: string, refreshToken: string, expiresIn: number) {
  if (typeof document === 'undefined') return;

  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  const accessMaxAge = Math.max(60, expiresIn || 3600);

  document.cookie = `app_access_token=${encodeURIComponent(accessToken)}; Max-Age=${accessMaxAge}; Path=/; SameSite=Lax${secureFlag}`;
  document.cookie = `app_refresh_token=${encodeURIComponent(refreshToken)}; Max-Age=${60 * 60 * 24 * 7}; Path=/; SameSite=Lax${secureFlag}`;
}

function persistRefreshedSession(session: AuthSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('app_session', JSON.stringify(session));
  window.dispatchEvent(new CustomEvent<AuthSession>('auth_token_refreshed', { detail: session }));
}

export async function attemptRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = getCookie('app_refresh_token');
  if (!refreshToken) return null;

  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Correlation-ID': createCorrelationId(),
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const session = (await response.json()) as AuthSession;
      setAuthCookies(session.accessToken, session.refreshToken, session.accessTokenExpiresInSeconds);
      persistRefreshedSession(session);
      return session.accessToken;
    } catch {
      document.cookie = 'app_access_token=; Max-Age=0; Path=/; SameSite=Lax';
      document.cookie = 'app_refresh_token=; Max-Age=0; Path=/; SameSite=Lax';
      localStorage.removeItem('app_session');
      window.location.href = '/auth/login';
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
