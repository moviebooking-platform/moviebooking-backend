import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, BookingSeat, SeatHold } from '../../entities';
import { ShowClientModule } from '../../clients/show-client.module';
import { TheatreClientModule } from '../../clients/theatre-client.module';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingSeat, SeatHold]),
    ShowClientModule,
    TheatreClientModule,
  ],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
