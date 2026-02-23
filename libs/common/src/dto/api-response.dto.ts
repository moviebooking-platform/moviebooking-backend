export class ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;

  static success<T>(data: T, meta?: Partial<ApiMeta>): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  static error(
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
