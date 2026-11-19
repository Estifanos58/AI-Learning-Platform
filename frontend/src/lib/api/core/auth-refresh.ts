import type { AuthSession } from '@/src/lib/types';
import { API_BASE_URL } from './config';
import { COOKIE_SESSION_SENTINEL, getCsrfToken } from './csrf';
import { createCorrelationId } from './helpers';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

function notifyRefreshedSession(session: AuthSession) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AuthSession>('auth_token_refreshed', { detail: session }));
}

export async function attemptRefresh(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Correlation-ID': createCorrelationId(),
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = (await response.json()) as Partial<AuthSession>;
      const session: AuthSession = {
        accessToken: COOKIE_SESSION_SENTINEL,
        refreshToken: '',
        tokenType: data.tokenType || 'Bearer',
        accessTokenExpiresInSeconds: data.accessTokenExpiresInSeconds || 900,
        user: data.user!,
      };
      notifyRefreshedSession(session);
      return true;
    } catch {
      window.dispatchEvent(new CustomEvent('auth_session_expired'));
      if (window.location.pathname.startsWith('/app')) {
        window.location.href = '/auth/login';
      }
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
