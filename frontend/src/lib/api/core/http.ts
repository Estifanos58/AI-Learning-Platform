import { attemptRefresh } from './auth-refresh';
import { buildRequestUrl } from './config';
import { getCsrfToken, isRealBearerToken, isStateChangingMethod } from './csrf';
import { createCorrelationId } from './helpers';
import type { FormDataRequestOptions, RequestOptions } from './types';

function buildAuthAndCsrfHeaders(
  method: string,
  token?: string | null,
  customHeaders?: Record<string, string>,
  hasBody?: boolean,
): Record<string, string> {
  const csrfToken = isStateChangingMethod(method) ? getCsrfToken() : null;
  return {
    Accept: 'application/json',
    'X-Correlation-ID': createCorrelationId(),
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(isRealBearerToken(token) ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...(customHeaders ?? {}),
  };
}

export async function executeRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const {
    method = 'GET',
    token,
    body,
    cache = 'no-store',
    next,
    signal,
    baseUrl,
    credentials = 'include',
    headers: customHeaders,
  } = options;

  const headers = buildAuthAndCsrfHeaders(method, token, customHeaders, Boolean(body));
  const requestUrl = buildRequestUrl(path, baseUrl);
  let response = await fetch(requestUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache,
    next,
    signal,
    credentials,
  });

  const isAuthBootstrapPath = path === '/auth/refresh' || path === '/auth/login' || path === '/auth/signup' || path === '/auth/session';
  if (response.status === 401 && !isAuthBootstrapPath && typeof window !== 'undefined') {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      const retryHeaders = buildAuthAndCsrfHeaders(method, token, customHeaders, Boolean(body));
      response = await fetch(requestUrl, {
        method,
        headers: retryHeaders,
        body: body ? JSON.stringify(body) : undefined,
        cache,
        next,
        signal,
        credentials,
      });
    }
  }

  return response;
}

export function sendFormDataRequest(
  path: string,
  options: FormDataRequestOptions,
  overrideToken?: string,
): Promise<{
  status: number;
  ok: boolean;
  contentType: string;
  responseText: string;
}> {
  const { method = 'POST', token, formData, signal, onUploadProgress } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const requestUrl = buildRequestUrl(path);
    const activeToken = overrideToken ?? token;

    xhr.open(method, requestUrl, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-Correlation-ID', createCorrelationId());
    if (isRealBearerToken(activeToken)) {
      xhr.setRequestHeader('Authorization', `Bearer ${activeToken}`);
    }
    if (isStateChangingMethod(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
      }
    }

    const handleAbort = () => {
      xhr.abort();
      reject(new Error('Upload aborted'));
    };

    if (signal) {
      if (signal.aborted) {
        handleAbort();
        return;
      }

      signal.addEventListener('abort', handleAbort, { once: true });
    }

    xhr.upload.addEventListener('progress', (event) => {
      onUploadProgress?.({
        loaded: event.loaded,
        total: event.lengthComputable ? event.total : 0,
        percent: event.lengthComputable && event.total > 0
          ? Math.round((event.loaded / event.total) * 100)
          : null,
      });
    });

    xhr.onerror = () => {
      reject(new Error('Network request failed'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload aborted'));
    };

    xhr.onload = () => {
      resolve({
        status: xhr.status,
        ok: xhr.status >= 200 && xhr.status < 300,
        contentType: xhr.getResponseHeader('content-type') || '',
        responseText: xhr.responseText ?? '',
      });
    };

    xhr.onloadend = () => {
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
    };

    xhr.send(formData);
  });
}
