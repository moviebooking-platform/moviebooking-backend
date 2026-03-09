import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, successResponse } from '../dto/api-response.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    // Skip wrapping for internal/service-to-service endpoints
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const meta = { requestId: request.headers['x-request-id'] };

    return next.handle().pipe(
      map((data) => {
        // If already wrapped in ApiResponse, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        if (data instanceof PaginatedResponse) {
          return {
            success: true,
            data: data.data,
            pagination: data.pagination,
            meta: { timestamp: new Date().toISOString(), ...meta },
          };
        }

        return successResponse(data, meta);
      }),
    );
  }
}
