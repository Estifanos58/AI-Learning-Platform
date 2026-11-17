import { attemptRefresh } from './core/auth-refresh';
import { API_BASE_URL } from './core/config';
import { mapErrorMessage, parseApiError, parseSuccessResponse } from './core/helpers';
import { executeRequest, sendFormDataRequest } from './core/http';
import type { FormDataRequestOptions, RequestOptions } from './core/types';

export { API_BASE_URL, mapErrorMessage };
export type { FormDataRequestOptions, RequestOptions };

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await executeRequest(path, options);

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw parseApiError(payload, response.status);
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? ((await response.json()) as T) : ((await response.text()) as T);
}

export async function apiRequestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await executeRequest(path, options);

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw parseApiError(payload, response.status);
  }

  return response.blob();
}

export async function formDataRequest<T>(path: string, options: FormDataRequestOptions): Promise<T> {
  let response = await sendFormDataRequest(path, options);

  if (response.status === 401 && path !== '/auth/refresh' && typeof window !== 'undefined') {
    const newToken = await attemptRefresh();
    if (newToken) {
      response = await sendFormDataRequest(path, options, newToken);
    }
  }

  if (!response.ok) {
    let payload: unknown = null;
    if (response.contentType.includes('application/json') && response.responseText) {
      try {
        payload = JSON.parse(response.responseText);
      } catch {
        payload = null;
      }
    }
    throw parseApiError(payload, response.status);
  }

  return parseSuccessResponse<T>(response.status, response.contentType, response.responseText);
}
