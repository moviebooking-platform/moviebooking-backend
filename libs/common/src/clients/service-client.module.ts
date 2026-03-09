import { DynamicModule, Module, Type } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

interface ServiceClientModuleOptions {
  /** Environment variable name for the service URL (e.g. 'THEATRE_SERVICE_URL') */
  envKey: string;
  /** Fallback URL if env var is not set */
  defaultUrl: string;
  /** Request timeout in milliseconds (default: 2000) */
  timeout?: number;
  /** The client class to provide and export */
  client: Type;
}

/**
 * Reusable module factory for inter-service HTTP clients.
 * Each service creates its own module using this factory.
 *
 * Usage:
 *   ServiceClientModule.register({
 *     envKey: 'THEATRE_SERVICE_URL',
 *     defaultUrl: 'http://localhost:3002',
 *     client: TheatreClient,
 *   })
 */
@Module({})
export class ServiceClientModule {
  static register(options: ServiceClientModuleOptions): DynamicModule {
    return {
      module: ServiceClientModule,
      imports: [
        HttpModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            baseURL: configService.get<string>(options.envKey, options.defaultUrl),
            timeout: options.timeout ?? 2000,
          }),
        }),
      ],
      providers: [options.client],
      exports: [options.client],
    };
  }
}
