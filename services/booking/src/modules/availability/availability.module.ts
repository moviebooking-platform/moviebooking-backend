import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, BookingSeat, SeatHold } from '../../entities';
import { ShowClientModule } from '../../clients/show-client.module';
import { TheatreClientModule } from '../../clients/theatre-client.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingSeat, SeatHold]),
    ShowClientModule,
    TheatreClientModule,
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
