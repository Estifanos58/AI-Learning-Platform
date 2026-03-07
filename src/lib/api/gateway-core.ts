import { z } from 'zod';
import { GatewayApiError } from './gateway-errors';
import type { AuthSession } from '@/src/lib/types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:8080/api/internal';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string;
  body?: unknown;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  signal?: AbortSignal;
}

function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseApiError(raw: any, fallbackStatus: number): GatewayApiError {
  if (!raw || typeof raw !== 'object') {
    return new GatewayApiError({ status: fallbackStatus, code: fallbackStatus >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST', message: 'Unexpected server response' });
  }
  return new GatewayApiError({
    status: typeof raw.status === 'number' ? raw.status : fallbackStatus,
    code: typeof raw.code === 'string' ? raw.code : 'BAD_REQUEST',
    message: typeof raw.message === 'string' ? raw.message : 'Request failed',
    correlationId: typeof raw.correlationId === 'string' ? raw.correlationId : undefined,
    details: typeof raw.details === 'object' ? raw.details : undefined,
  });
}

export function mapErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof GatewayApiError) return error.message;
  if (error instanceof z.ZodError) return error.issues[0]?.message || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

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

async function attemptRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = getCookie('app_refresh_token');
  if (!refreshToken) return null;

  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Correlation-ID': createCorrelationId(),
        },
        body: JSON.stringify({ refreshToken })
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = (await res.json()) as AuthSession;

      setAuthCookies(data.accessToken, data.refreshToken, data.accessTokenExpiresInSeconds);
      persistRefreshedSession(data);
      return data.accessToken;
    } catch (err) {
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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body, cache = 'no-store', next, signal } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Correlation-ID': createCorrelationId(),
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache,
    next,
    signal,
  });

  if (response.status === 401 && path !== '/auth/refresh' && typeof window !== 'undefined') {
    const newToken = await attemptRefresh();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache,
        next,
        signal,
      });
    }
  }

  if (!response.ok) {
    let payload: any = null;
    try { payload = await response.json(); } catch { payload = null; }
    throw parseApiError(payload, response.status);
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? ((await response.json()) as T) : ((await response.text()) as T);
}
