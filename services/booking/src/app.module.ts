import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevModule } from '@moviebooking/common';
import { Booking, BookingSeat, SeatHold } from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { RedisModule } from './redis/redis.module';
import { MessagingModule } from './messaging/messaging.module';

const devModules = process.env.NODE_ENV !== 'production' ? [DevModule] : [];

/** Root module for Booking Service. Configures database, auth, and feature modules. */
@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    // Database — Booking Service owns: bookings, booking_seats, seat_holds
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mssql' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '1433'), 10),
        username: configService.get<string>('DB_USERNAME', 'sa'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_DATABASE', 'moviebooking_db'),
        entities: [Booking, BookingSeat, SeatHold],
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      }),
    }),

    // Authentication
    AuthModule,

    // Seat availability (read path)
    AvailabilityModule,

    // Seat hold and booking management (write path)
    BookingsModule,

    // Redis seat-lock infrastructure (global)
    RedisModule,

    // RabbitMQ event publishing (global)
    MessagingModule,

    // Dev modules (only in non-production)
    ...devModules,
  ],
})
export class AppModule {}
