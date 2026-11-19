/**
 * Non-secret marker stored in in-memory React AuthSession state when the browser
 * authenticates using server-managed HttpOnly cookies.
 */
export const COOKIE_SESSION_SENTINEL = 'cookie-session';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function isRealBearerToken(token?: string | null): token is string {
  return Boolean(token && token.trim() && token !== COOKIE_SESSION_SENTINEL);
}

export function isStateChangingMethod(method?: string): boolean {
  if (!method) return false;
  return STATE_CHANGING_METHODS.has(method.toUpperCase());
}

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )app_csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
