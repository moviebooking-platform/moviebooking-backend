import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, BookingSeat, SeatHold } from '@moviebooking/database';
import { ShowClientModule } from '../../clients/show-client.module';
import { TheatreClientModule } from '../../clients/theatre-client.module';
import { RedisModule } from '../../redis/redis.module';
import { MessagingModule } from '../../messaging/messaging.module';
import { BookingsController } from './bookings.controller';
import { HoldService } from './hold.service';
import { BookingQueryService } from './booking-query.service';
import { BookingCancelService } from './booking-cancel.service';
import { BookingRefGenerator } from './booking-ref.generator';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingSeat, SeatHold]),
    ShowClientModule,
    TheatreClientModule,
    RedisModule, // Provides SeatLockService
    MessagingModule, // Provides BookingEventsPublisher
  ],
  controllers: [BookingsController],
  providers: [
    HoldService,
    BookingQueryService,
    BookingCancelService,
    BookingRefGenerator,
  ],
  exports: [HoldService, BookingQueryService, BookingCancelService],
})
export class BookingsModule {}
