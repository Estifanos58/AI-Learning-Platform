const envApiUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL?.trim() : undefined;

// Respect NEXT_PUBLIC_API_URL and route through public API gateway (e.g. http://localhost:8080/api)
export const API_BASE_URL = envApiUrl
  ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl.replace(/\/api\/internal\/?$/i, '').replace(/\/+$/, '')}/api`)
  : 'http://localhost:8080/api';

export function getServerApiBaseUrl(): string {
  if (typeof process !== 'undefined') {
    const internalUrl =
      process.env.INTERNAL_API_URL?.trim() ||
      process.env.API_GATEWAY_INTERNAL_URL?.trim();
    if (internalUrl) {
      return internalUrl.endsWith('/api')
        ? internalUrl
        : `${internalUrl.replace(/\/api\/internal\/?$/i, '').replace(/\/+$/, '')}/api`;
    }
  }
  return API_BASE_URL;
}

export function buildRequestUrl(path: string, baseUrl?: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const defaultBase = typeof window === 'undefined' ? getServerApiBaseUrl() : API_BASE_URL;
  const normalizedBase = (baseUrl ?? defaultBase).replace(/\/+$/, '');
  if (!normalizedBase) {
    return path;
  }

  if (!path) {
    return normalizedBase;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
