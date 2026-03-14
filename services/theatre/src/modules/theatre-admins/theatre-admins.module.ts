import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TheatreAdmin, Theatre } from '../../entities';
import { User, Role } from '@moviebooking/database';
import { AuthModule } from '../auth/auth.module';
import { TheatreAdminsController } from './theatre-admins.controller';
import { TheatreAdminsService } from './theatre-admins.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TheatreAdmin, User, Role, Theatre]),
    AuthModule,
  ],
  controllers: [TheatreAdminsController],
  providers: [TheatreAdminsService],
  exports: [TheatreAdminsService],
})
export class TheatreAdminsModule {}
