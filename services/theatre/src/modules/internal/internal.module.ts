import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { Screen, Seat, TheatreAdmin } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([TheatreAdmin, Screen, Seat])],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
