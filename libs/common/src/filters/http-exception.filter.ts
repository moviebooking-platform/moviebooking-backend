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
import { ERROR_CODES } from '../constants/error-codes.constant';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ERROR_CODES.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: any[] | undefined;

    if (exception instanceof HttpException) {
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
    } else if (exception instanceof Error) {
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
    switch (status) {
      case 400:
        return ERROR_CODES.VALIDATION_ERROR;
      case 401:
        return ERROR_CODES.UNAUTHORIZED;
      case 403:
        return ERROR_CODES.FORBIDDEN;
      case 404:
        return ERROR_CODES.NOT_FOUND;
      case 409:
        return ERROR_CODES.DUPLICATE_RESOURCE;
      case 429:
        return ERROR_CODES.RATE_LIMIT_EXCEEDED;
      default:
        return ERROR_CODES.INTERNAL_ERROR;
    }
  }
}
