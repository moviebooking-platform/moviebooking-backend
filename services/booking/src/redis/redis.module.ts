import {
  Global,
  Inject,
  Logger,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { SeatLockService } from './seat-lock.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const logger = new Logger('RedisClient');
        const client = new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: parseInt(config.get<string>('REDIS_PORT', '6379'), 10),
          // No fallback for the password — an empty/hardcoded secret is worse than none.
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          // Reject commands immediately while disconnected so the lock can fail open instead of hanging.
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
        });
        // Without a listener ioredis would throw on connection errors and crash the process.
        client.on('error', (err: Error) =>
          logger.warn(`Redis connection error: ${err.message}`),
        );
        return client;
      },
    },
    SeatLockService,
  ],
  exports: [REDIS_CLIENT, SeatLockService],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}
