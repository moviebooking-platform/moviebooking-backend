import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Error definitions with HTTP status codes
 */
export const ERRORS = {
  // Validation
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    status: HttpStatus.BAD_REQUEST,
  },

  // Authentication
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    status: HttpStatus.UNAUTHORIZED,
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Token has expired',
    status: HttpStatus.UNAUTHORIZED,
  },
  TOKEN_INVALID: {
    code: 'TOKEN_INVALID',
    message: 'Invalid token',
    status: HttpStatus.UNAUTHORIZED,
  },
  PASSWORD_EXPIRED: {
    code: 'PASSWORD_EXPIRED',
    message: 'Temporary password has expired. Please contact administrator.',
    status: HttpStatus.UNAUTHORIZED,
  },

  // Authorization
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Access denied',
    status: HttpStatus.FORBIDDEN,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    status: HttpStatus.UNAUTHORIZED,
  },

  // Resources
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    status: HttpStatus.NOT_FOUND,
  },
  DUPLICATE_RESOURCE: {
    code: 'DUPLICATE_RESOURCE',
    message: 'Resource already exists',
    status: HttpStatus.CONFLICT,
  },

  // Database
  DB_DUPLICATE_KEY: {
    code: 'DUPLICATE_RESOURCE',
    message: 'A record with the same value already exists',
    status: HttpStatus.CONFLICT,
  },
  DB_FOREIGN_KEY_VIOLATION: {
    code: 'VALIDATION_ERROR',
    message: 'Referenced record does not exist or cannot be removed',
    status: HttpStatus.BAD_REQUEST,
  },
  DB_NOT_NULL_VIOLATION: {
    code: 'VALIDATION_ERROR',
    message: 'A required field is missing',
    status: HttpStatus.BAD_REQUEST,
  },
  DB_CONNECTION_ERROR: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Database connection unavailable',
    status: HttpStatus.SERVICE_UNAVAILABLE,
  },
  DB_UNKNOWN_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected database error occurred',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },

  // Business Rules
  BUSINESS_RULE_VIOLATION: {
    code: 'BUSINESS_RULE_VIOLATION',
    message: 'Business rule violation',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
  },

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests',
    status: HttpStatus.TOO_MANY_REQUESTS,
  },

  // Server
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
    status: HttpStatus.SERVICE_UNAVAILABLE,
  },
} as const;

// Type for error keys
export type ErrorKey = keyof typeof ERRORS;

// Type for error definition
export type ErrorDefinition = (typeof ERRORS)[ErrorKey];

export class AppException extends HttpException {
  public readonly errorCode: string;

  constructor(errorKey: ErrorKey, customMessage?: string) {
    const error = ERRORS[errorKey];
    const message = customMessage || error.message;

    super({ code: error.code, message }, error.status);
    this.errorCode = error.code;
  }
}

/**
 * Get error with default message
 * Usage: getError('NOT_FOUND')
 */
export function getError(key: ErrorKey): { code: string; message: string } {
  return { code: ERRORS[key].code, message: ERRORS[key].message };
}

/**
 * Get error with custom message
 * Usage: getErrorWithMessage('NOT_FOUND', 'User not found')
 */
export function getErrorWithMessage(
  key: ErrorKey,
  message: string,
): { code: string; message: string } {
  return { code: ERRORS[key].code, message };
}

/**
 * Throw application exception
 * Usage: throwError('NOT_FOUND', 'User not found')
 */
export function throwError(key: ErrorKey, customMessage?: string): never {
  throw new AppException(key, customMessage);
}
