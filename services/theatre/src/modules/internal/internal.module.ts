import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { Theatre, TheatreAdmin, Screen, Seat } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Theatre, TheatreAdmin, Screen, Seat])],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
