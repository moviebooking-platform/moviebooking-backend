import { Module } from '@nestjs/common';
import { ServiceClientModule } from '@moviebooking/common';
import { TheatreClient } from './theatre.client';

const theatreClientModule = ServiceClientModule.register({
  envKey: 'THEATRE_SERVICE_URL',
  defaultUrl: 'http://localhost:3002',
  client: TheatreClient,
});

@Module({
  imports: [theatreClientModule],
  exports: [theatreClientModule],
})
export class TheatreClientModule {}
