export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
  pagination?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any[];
}

export interface ApiMeta {
  timestamp: string;
  requestId?: string;
}

export function successResponse<T>(data: T, meta?: Partial<ApiMeta>): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: any[],
): ApiResponse<null> {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}
