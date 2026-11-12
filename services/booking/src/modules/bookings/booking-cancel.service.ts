import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { throwError } from '@moviebooking/common';
import {
  Booking,
  SeatHold,
  BookingStatus,
  SeatHoldStatus,
} from '@moviebooking/database';
import { assertTransition } from './booking-state';
import { BookingEventsPublisher } from '../../messaging/booking-events.publisher';

/**
 * Guest-initiated cancellation.
 *
 * Rules: the guest must give the booking email as well as the reference, and only a
 * HOLDING booking can be cancelled. Once payment has started (PAYMENT_PENDING) the
 * outcome belongs to the Payment Service, so a guest cancel could otherwise race a
 * successful charge.
 */
@Injectable()
export class BookingCancelService {
  private readonly logger = new Logger(BookingCancelService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly eventsPublisher: BookingEventsPublisher,
  ) {}

  /** HOLDING → FAILED and releases the holds. Returns the booking with seats and holds. */
  async cancelBooking(bookingRef: string, email: string): Promise<Booking> {
    const cancelled = await this.dataSource.transaction(async (manager) => {
      // The row lock serialises cancel with confirm, fail and the expiry sweep.
      const booking = await manager.findOne(Booking, {
        where: { bookingRef },
        lock: { mode: 'pessimistic_write' },
      });

      // A wrong email gets the same answer as an unknown reference, so the
      // endpoint does not reveal which references exist.
      if (!booking || !this.emailMatches(booking.email, email)) {
        throwError('NOT_FOUND', `Booking ${bookingRef} not found`);
      }

      if (booking.status !== BookingStatus.HOLDING) {
        throwError(
          'BUSINESS_RULE_VIOLATION',
          `Cannot cancel booking in ${booking.status} status. Only HOLDING bookings can be cancelled.`,
        );
      }

      assertTransition(booking.status, BookingStatus.FAILED);
      booking.status = BookingStatus.FAILED;
      await manager.save(Booking, booking);

      await manager.update(
        SeatHold,
        { bookingId: booking.id, status: SeatHoldStatus.ACTIVE },
        { status: SeatHoldStatus.RELEASED },
      );

      return booking;
    });

    this.logger.log(`Booking cancelled: ${cancelled.bookingRef}`);

    this.eventsPublisher
      .publishFailed({
        bookingRef: cancelled.bookingRef,
        showId: cancelled.showId,
      })
      .catch((err) => {
        this.logger.error(`Failed to publish booking.failed: ${err.message}`);
      });

    return this.bookingRepo.findOne({
      where: { id: cancelled.id },
      relations: ['seats', 'holds'],
    });
  }

  private emailMatches(stored: string, given: string): boolean {
    return stored.trim().toLowerCase() === given.trim().toLowerCase();
  }
}
