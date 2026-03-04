import { z } from 'zod';
import { GatewayApiError } from './gateway-errors';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:8081';

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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body, cache = 'no-store', next, signal } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'X-Correlation-ID': createCorrelationId(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache,
    next,
    signal,
  });

  if (!response.ok) {
    let payload: any = null;
    try { payload = await response.json(); } catch { payload = null; }
    throw parseApiError(payload, response.status);
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? ((await response.json()) as T) : ((await response.text()) as T);
}
