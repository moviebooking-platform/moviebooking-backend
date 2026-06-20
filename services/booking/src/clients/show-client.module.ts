import { Module } from '@nestjs/common';
import { ServiceClientModule } from '@moviebooking/common';
import { ShowClient } from './show.client';

const showClientModule = ServiceClientModule.register({
  envKey: 'SHOW_SERVICE_URL',
  defaultUrl: 'http://localhost:3004',
  client: ShowClient,
});

@Module({
  imports: [showClientModule],
  exports: [showClientModule],
})
export class ShowClientModule {}
