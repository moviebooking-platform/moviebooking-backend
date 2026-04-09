import { Module } from '@nestjs/common';
import { ServiceClientModule } from '@moviebooking/common';
import { MovieClient } from './movie.client';

const movieClientModule = ServiceClientModule.register({
  envKey: 'MOVIE_SERVICE_URL',
  defaultUrl: 'http://localhost:3003',
  client: MovieClient,
});

/**
 * Module for Movie Service client.
 * Configures HTTP client with MOVIE_SERVICE_URL from environment.
 */
@Module({
  imports: [movieClientModule],
  exports: [movieClientModule],
})
export class MovieClientModule {}
