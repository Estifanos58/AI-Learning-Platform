export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  code: string;
  message: string;
  path: string;
  correlationId: string;
  details?: Record<string, string>;
}

export class GatewayApiError extends Error {
  status: number;
  code: string;
  correlationId?: string;
  details?: Record<string, string>;

  constructor(payload: Partial<ApiErrorResponse> & { message: string }) {
    super(payload.message);
    this.name = 'GatewayApiError';
    this.status = payload.status ?? 500;
    this.code = payload.code ?? 'INTERNAL_ERROR';
    this.correlationId = payload.correlationId;
    this.details = payload.details;
  }
}
