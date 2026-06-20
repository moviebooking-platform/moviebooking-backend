import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { AppException, BaseServiceClient } from '@moviebooking/common';

// Base for Booking's inter-service clients.
// Keeps 404 (returns null) distinct from outages (throws SERVICE_UNAVAILABLE), so callers never act on half-known data.
export abstract class BookingServiceClient extends BaseServiceClient {
  constructor(httpService: HttpService, serviceName: string) {
    super(httpService, serviceName);
  }

  /** GET that returns null on 404, throws SERVICE_UNAVAILABLE on any other failure. */
  protected getOrNull<T>(path: string): Promise<T | null> {
    return this.request<T>('get', path);
  }

  /** POST that returns null on 404, throws SERVICE_UNAVAILABLE on any other failure. */
  protected postOrNull<T>(
    path: string,
    body: Record<string, any>,
  ): Promise<T | null> {
    return this.request<T>('post', path, body);
  }

  private async request<T>(
    method: 'get' | 'post',
    path: string,
    body?: Record<string, any>,
  ): Promise<T | null> {
    try {
      const response =
        method === 'get'
          ? await firstValueFrom(this.httpService.get<T>(path))
          : await firstValueFrom(this.httpService.post<T>(path, body ?? {}));
      return response.data;
    } catch (error) {
      const status = (error as AxiosError).response?.status;

      // 404 is a real answer, not an outage.
      if (status === 404) {
        return null;
      }

      this.logger.warn(
        `${method.toUpperCase()} ${path} failed: ${(error as Error).message}`,
      );
      throw new AppException('SERVICE_UNAVAILABLE');
    }
  }
}
