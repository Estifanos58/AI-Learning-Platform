export const API_BASE_URL = 'http://localhost:8080/api/internal';

export function buildRequestUrl(path: string, baseUrl?: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedBase = baseUrl ?? API_BASE_URL;
  if (!normalizedBase) {
    return path;
  }

  if (!path) {
    return normalizedBase;
  }

  if (normalizedBase.endsWith('/') && path.startsWith('/')) {
    return `${normalizedBase}${path.slice(1)}`;
  }

  if (!normalizedBase.endsWith('/') && !path.startsWith('/')) {
    return `${normalizedBase}/${path}`;
  }

  return `${normalizedBase}${path}`;
}
