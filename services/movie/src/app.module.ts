import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevModule } from '@moviebooking/common';
import { Movie, MovieImage, MovieRequest } from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { MoviesModule } from './modules/movies/movies.module';
import { MovieImagesModule } from './modules/movie-images/movie-images.module';
import { MovieRequestsModule } from './modules/movie-requests/movie-requests.module';
import { InternalModule } from './modules/internal/internal.module';

const devModules = process.env.NODE_ENV !== 'production' ? [DevModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    // Database — Movie Service owns: movies, movie_images, movie_requests
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
        entities: [Movie, MovieImage, MovieRequest],
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      }),
    }),

    AuthModule,
    MoviesModule,
    MovieImagesModule,
    MovieRequestsModule,
    InternalModule,

    ...devModules,
  ],
})
export class AppModule {}
