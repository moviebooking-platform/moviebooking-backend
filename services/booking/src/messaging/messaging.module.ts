import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { BookingEventsPublisher } from './booking-events.publisher';

/** Builds the AMQP URI, folding RABBITMQ_USER/PASSWORD into the base URL when present. */
function buildAmqpUri(config: ConfigService): string {
  const base = config.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');
  const user = config.get<string>('RABBITMQ_USER');
  const password = config.get<string>('RABBITMQ_PASSWORD');

  // No credentials configured — use the URI as-is (no hardcoded fallback secret).
  if (!user) {
    return base;
  }

  const url = new URL(base);
  url.username = user;
  url.password = password ?? '';
  return url.toString();
}

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        exchanges: [
          {
            name: config.get<string>(
              'RABBITMQ_BOOKING_EXCHANGE',
              'booking.events',
            ),
            type: 'topic',
          },
        ],
        uri: buildAmqpUri(config),
        // Don't block bootstrap on the broker — publishing reconnects on its own.
        connectionInitOptions: { wait: false },
      }),
    }),
  ],
  providers: [BookingEventsPublisher],
  exports: [BookingEventsPublisher],
})
export class MessagingModule {}
