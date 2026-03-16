import { Module } from '@nestjs/common';
import { ServiceClientModule } from '@moviebooking/common';
import { IdentityClient } from './identity.client';

const identityClientModule = ServiceClientModule.register({
  envKey: 'IDENTITY_SERVICE_URL',
  defaultUrl: 'http://localhost:3001',
  client: IdentityClient,
});

@Module({
  imports: [identityClientModule],
  exports: [identityClientModule],
})
export class IdentityClientModule {}
