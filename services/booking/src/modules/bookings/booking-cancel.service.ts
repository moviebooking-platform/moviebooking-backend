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

/** Handles guest-initiated booking cancellation. */
@Injectable()
export class BookingCancelService {
  private readonly logger = new Logger(BookingCancelService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(SeatHold)
    private readonly seatHoldRepo: Repository<SeatHold>,
    private readonly eventsPublisher: BookingEventsPublisher,
  ) {}

  /** Cancels booking if in HOLDING or PAYMENT_PENDING status. Publishes booking.failed event. */
  async cancelBooking(booking: Booking): Promise<Booking> {
    this.logger.log(`Cancelling booking: ${booking.bookingRef}`);

    // Validate current status allows cancellation
    if (
      ![BookingStatus.HOLDING, BookingStatus.PAYMENT_PENDING].includes(
        booking.status,
      )
    ) {
      throwError(
        'BUSINESS_RULE_VIOLATION',
        `Cannot cancel booking in ${booking.status} status. Only HOLDING or PAYMENT_PENDING bookings can be cancelled.`,
      );
    }

    // Verify state transition is allowed
    assertTransition(booking.status, BookingStatus.FAILED);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update booking status to FAILED
      booking.status = BookingStatus.FAILED;
      await queryRunner.manager.save(booking);

      // Release all active seat holds
      await queryRunner.manager
        .createQueryBuilder()
        .update(SeatHold)
        .set({ status: SeatHoldStatus.RELEASED })
        .where('booking_id = :bookingId', { bookingId: booking.id })
        .andWhere('status = :status', { status: SeatHoldStatus.ACTIVE })
        .execute();

      await queryRunner.commitTransaction();

      this.logger.log(
        `Booking cancelled successfully: ${booking.bookingRef}`,
      );

      // Publish event (fire-and-forget)
      this.eventsPublisher
        .publishFailed({
          bookingRef: booking.bookingRef,
          showId: booking.showId,
        })
        .catch((err) => {
          this.logger.error(
            `Failed to publish booking.failed event: ${err.message}`,
          );
        });

      return booking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to cancel booking ${booking.bookingRef}: ${error.message}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
