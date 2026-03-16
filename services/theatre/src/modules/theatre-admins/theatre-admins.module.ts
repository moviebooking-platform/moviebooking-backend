import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TheatreAdmin, Theatre } from '../../entities';
import { AuthModule } from '../auth/auth.module';
import { IdentityClientModule } from '../../clients/identity-client.module';
import { TheatreAdminsController } from './theatre-admins.controller';
import { TheatreAdminsService } from './theatre-admins.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TheatreAdmin, Theatre]),
    AuthModule,
    IdentityClientModule,
  ],
  controllers: [TheatreAdminsController],
  providers: [TheatreAdminsService],
  exports: [TheatreAdminsService],
})
export class TheatreAdminsModule {}
