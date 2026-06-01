import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { Screen, TheatreAdmin } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([TheatreAdmin, Screen])],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
