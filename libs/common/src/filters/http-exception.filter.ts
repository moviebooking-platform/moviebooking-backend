import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { errorResponse } from '../dto/api-response.dto';
import { ERRORS, ErrorKey } from '../constants/error-codes.constant';
import { AppException } from '../exceptions/app.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ERRORS.INTERNAL_ERROR.code;
    let message: string = ERRORS.INTERNAL_ERROR.message;
    let details: any[] | undefined;

    // Handle AppException
    if (exception instanceof AppException) {
      status = exception.getStatus();
      const res = exception.getResponse() as { code: string; message: string };
      code = res.code;
      message = res.message;
    }
    // Handle standard HttpException
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        code = (res.code as string) || this.getErrorCodeFromStatus(status);

        // Handle ValidationPipe Exception  
        // ValidationPipe returns { message: string[], statusCode, error }
        if (Array.isArray(res.message)) {
          message = 'Validation failed';
          details = res.message.map((msg: string) => ({ message: msg }));
        } else {
          message = (res.message as string) || exception.message;
          details = (res.details || res.errors) as any[] | undefined;
        }
      } else {
        message = exceptionResponse as string;
        code = this.getErrorCodeFromStatus(status);
      }
    }
    // Handle TypeORM / SQL Server database errors
    else if (this.isDatabaseError(exception)) {
      const dbError = this.mapDatabaseError(exception as Record<string, any>);
      status = dbError.status;
      code = dbError.code;
      message = dbError.message;
      this.logger.warn(
        `Database error [${(exception as any).number || 'unknown'}]: ${(exception as Error).message}`,
      );
    }
    // Handle unknown errors
    else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    const body = errorResponse(code, message, details);
    body.meta = {
      timestamp: new Date().toISOString(),
      requestId: request.headers['x-request-id'],
    };

    response.status(status).json(body);
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusToError: Record<number, ErrorKey> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'DUPLICATE_RESOURCE',
      429: 'RATE_LIMIT_EXCEEDED',
    };

    const errorKey = statusToError[status] || 'INTERNAL_ERROR';
    return ERRORS[errorKey].code;
  }

  /**
   * Detect TypeORM QueryFailedError or raw SQL Server errors.
   * TypeORM wraps DB errors in QueryFailedError which has a `number` property
   * (SQL Server error code) and `name === 'QueryFailedError'`.
   */
  private isDatabaseError(exception: unknown): boolean {
    if (!(exception instanceof Error)) return false;
    const err = exception as Record<string, any>;
    return (
      err.name === 'QueryFailedError' ||
      typeof err.number === 'number' ||
      err.code === 'EREQUEST' ||
      err.code === 'ECONNCLOSED'
    );
  }

  /**
   * Map SQL Server error codes to our standard error format.
   * Never expose raw DB error messages to clients.
   *
   * Common SQL Server error numbers:
   * - 2627: Unique constraint violation (PRIMARY KEY or UNIQUE)
   * - 2601: Unique index violation
   * - 547:  Foreign key constraint violation
   * - 515:  Cannot insert NULL into NOT NULL column
   */
  private mapDatabaseError(
    exception: Record<string, any>,
  ): { status: number; code: string; message: string } {
    const sqlErrorNumber = exception.number as number | undefined;

    switch (sqlErrorNumber) {
      case 2627:
      case 2601:
        return ERRORS.DB_DUPLICATE_KEY;

      case 547:
        return ERRORS.DB_FOREIGN_KEY_VIOLATION;

      case 515:
        return ERRORS.DB_NOT_NULL_VIOLATION;

      default:
        if (exception.code === 'ECONNCLOSED') {
          return ERRORS.DB_CONNECTION_ERROR;
        }
        return ERRORS.DB_UNKNOWN_ERROR;
    }
  }
}
