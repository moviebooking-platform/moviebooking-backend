import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Show, ShowPrice } from '../../entities';
import { SeatAvailabilityController } from './seat-availability.controller';
import { SeatAvailabilityService } from './seat-availability.service';
import { TheatreClientModule } from '../../clients/theatre-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Show, ShowPrice]),
    TheatreClientModule,
  ],
  controllers: [SeatAvailabilityController],
  providers: [SeatAvailabilityService],
})
export class SeatAvailabilityModule {}
