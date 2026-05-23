import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevModule } from '@moviebooking/common';
import { Show, ShowPrice } from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { ShowsModule } from './modules/shows/shows.module';

const devModules = process.env.NODE_ENV !== 'production' ? [DevModule] : [];


/** Root module for Show Service. Configures database, auth, and feature modules. */
 
@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    // Database — Show Service owns: shows, show_prices
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
        entities: [Show, ShowPrice],
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

    // Feature modules
    ShowsModule,

    // Dev modules (only in non-production)
    ...devModules,
  ],
})
export class AppModule {}
