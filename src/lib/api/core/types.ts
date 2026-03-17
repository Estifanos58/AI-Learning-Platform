export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string;
  body?: unknown;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  signal?: AbortSignal;
  baseUrl?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
}

export interface FormDataRequestOptions {
  method?: 'POST' | 'PUT' | 'PATCH';
  token?: string;
  formData: FormData;
  signal?: AbortSignal;
  onUploadProgress?: (progress: {
    loaded: number;
    total: number;
    percent: number | null;
  }) => void;
}
