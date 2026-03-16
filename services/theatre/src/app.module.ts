import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevModule } from '@moviebooking/common';
import { Theatre, TheatreAdmin, Screen, Seat } from './entities';
import { InternalModule } from './modules/internal/internal.module';
import { AuthModule } from './modules/auth/auth.module';
import { TheatresModule } from './modules/theatres/theatres.module';
import { TheatreAdminsModule } from './modules/theatre-admins/theatre-admins.module';

// Conditionally include DevModule only in development
const devModules = process.env.NODE_ENV !== 'production' ? [DevModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    // Database — Theatre Service owns: theatres, theatre_admins, screens, seats
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
        entities: [Theatre, TheatreAdmin, Screen, Seat],
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      }),
    }),

    // Feature modules
    AuthModule,
    InternalModule,
    TheatresModule,
    TheatreAdminsModule,

    // Dev modules (only in non-production)
    ...devModules,
  ],
})
export class AppModule {}
