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
import { TheatreBookingScopeService } from './theatre-booking-scope.service';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminBookingQueryService } from './admin-booking-query.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingSeat, SeatHold]),
    ShowClientModule,
    TheatreClientModule,
    RedisModule, // Provides SeatLockService
    MessagingModule, // Provides BookingEventsPublisher
  ],
  controllers: [BookingsController, AdminBookingsController],
  providers: [
    HoldService,
    BookingQueryService,
    BookingCancelService,
    BookingRefGenerator,
    TheatreBookingScopeService,
    AdminBookingQueryService,
  ],
  exports: [
    HoldService,
    BookingQueryService,
    BookingCancelService,
    TheatreBookingScopeService,
  ],
})
export class BookingsModule {}
