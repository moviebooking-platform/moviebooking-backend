import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Base class for inter-service HTTP clients.
 * Provides standardized error handling, logging, and graceful degradation.
 */
@Injectable()
export abstract class BaseServiceClient {
  protected readonly logger: Logger;

  constructor(
    protected readonly httpService: HttpService,
    serviceName: string,
  ) {
    this.logger = new Logger(serviceName);
  }

  /**
   * GET request with graceful degradation.
   * Returns null if the target service is unavailable.
   */
  protected async get<T>(path: string): Promise<T | null> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<T>(path),
      );
      return data;
    } catch (error) {
      this.logger.warn(`GET ${path} failed: ${error.message}`);
      return null;
    }
  }

  /**
   * POST request with graceful degradation.
   * Returns null if the target service is unavailable.
   */
  protected async post<T>(path: string, body: Record<string, any>): Promise<T | null> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<T>(path, body),
      );
      return data;
    } catch (error) {
      this.logger.warn(`POST ${path} failed: ${error.message}`);
      return null;
    }
  }
}
