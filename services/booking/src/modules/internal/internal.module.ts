import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, BookingSeat, SeatHold } from '../../entities';
import { MessagingModule } from '../../messaging/messaging.module';
import { InternalBookingsController } from './internal-bookings.controller';
import { InternalBookingsService } from './internal-bookings.service';
import { InternalTransitionsService } from './internal-transitions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingSeat, SeatHold]),
    MessagingModule,
  ],
  controllers: [InternalBookingsController],
  providers: [InternalBookingsService, InternalTransitionsService],
  exports: [InternalBookingsService, InternalTransitionsService],
})
export class InternalModule {}
