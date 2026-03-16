import { HttpException } from '@nestjs/common';
import { ERRORS, ErrorKey } from '../constants/error-codes.constant';

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
