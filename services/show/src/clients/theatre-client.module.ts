import { Module } from '@nestjs/common';
import { ServiceClientModule } from '@moviebooking/common';
import { TheatreClient } from './theatre.client';

const theatreClientModule = ServiceClientModule.register({
  envKey: 'THEATRE_SERVICE_URL',
  defaultUrl: 'http://localhost:3002',
  client: TheatreClient,
});

/**
 * Module for Theatre Service client.
 * Configures HTTP client with THEATRE_SERVICE_URL from environment.
 */
@Module({
  imports: [theatreClientModule],
  exports: [theatreClientModule],
})
export class TheatreClientModule {}
