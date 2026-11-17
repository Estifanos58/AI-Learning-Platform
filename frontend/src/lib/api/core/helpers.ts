import { z } from 'zod';
import { GatewayApiError } from '../gateway-errors';

export function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseApiError(raw: unknown, fallbackStatus: number): GatewayApiError {
  if (!raw || typeof raw !== 'object') {
    return new GatewayApiError({
      status: fallbackStatus,
      code: fallbackStatus >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
      message: 'Unexpected server response',
    });
  }

  const payload = raw as Record<string, unknown>;
  const details =
    payload.details && typeof payload.details === 'object'
      ? (Object.fromEntries(
          Object.entries(payload.details as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
        ) as Record<string, string>)
      : undefined;

  return new GatewayApiError({
    status: typeof payload.status === 'number' ? payload.status : fallbackStatus,
    code: typeof payload.code === 'string' ? payload.code : 'BAD_REQUEST',
    message: typeof payload.message === 'string' ? payload.message : 'Request failed',
    correlationId: typeof payload.correlationId === 'string' ? payload.correlationId : undefined,
    details,
  });
}

export function parseSuccessResponse<T>(status: number, contentType: string, responseText: string): T {
  if (status === 204) return undefined as T;
  if (contentType.includes('application/json')) {
    return responseText ? (JSON.parse(responseText) as T) : (undefined as T);
  }
  return responseText as T;
}

export function mapErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof GatewayApiError) return error.message;
  if (error instanceof z.ZodError) return error.issues[0]?.message || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}
