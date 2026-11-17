const envApiUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL?.trim() : undefined;

// Respect NEXT_PUBLIC_API_URL and route through public API gateway (e.g. http://localhost:8080/api)
export const API_BASE_URL = envApiUrl
  ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl.replace(/\/api\/internal\/?$/i, '').replace(/\/+$/, '')}/api`)
  : 'http://localhost:8080/api';

export function buildRequestUrl(path: string, baseUrl?: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedBase = (baseUrl ?? API_BASE_URL).replace(/\/+$/, '');
  if (!normalizedBase) {
    return path;
  }

  if (!path) {
    return normalizedBase;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
