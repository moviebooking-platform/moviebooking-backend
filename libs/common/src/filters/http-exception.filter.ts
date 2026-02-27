import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../dto/api-response.dto';
import { ERRORS, ErrorKey, AppException } from '../constants/error-codes.constant';

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
        const res = exceptionResponse as any;
        code = res.code || this.getErrorCodeFromStatus(status);
        message = res.message || exception.message;
        details = res.details || res.errors;
      } else {
        message = exceptionResponse as string;
        code = this.getErrorCodeFromStatus(status);
      }
    }
    // Handle unknown errors
    else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse = ApiResponse.error(code, message, details);
    errorResponse.meta = {
      timestamp: new Date().toISOString(),
      requestId: request.headers['x-request-id'],
    };

    response.status(status).json(errorResponse);
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
}
