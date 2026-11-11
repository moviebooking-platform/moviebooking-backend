import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import {
  Booking,
  SeatHold,
  BookingStatus,
  SeatHoldStatus,
} from '../../entities';
import { BookingEventsPublisher } from '../../messaging/booking-events.publisher';
import { assertTransition } from './booking-state';

/** Upper bound per status per run; anything left over is picked up next minute. */
export const SWEEP_BATCH_SIZE = 200;

type ExpirableStatus = BookingStatus.HOLDING | BookingStatus.PAYMENT_PENDING;

/** Scheduled job that expires bookings whose hold or payment deadline has passed. */
@Injectable()
export class HoldSweepService {
  private readonly logger = new Logger(HoldSweepService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly dataSource: DataSource,
    private readonly eventsPublisher: BookingEventsPublisher,
  ) {}

  /** Runs every minute: expires overdue HOLDING bookings, then overdue PAYMENT_PENDING ones. */
  @Cron(CronExpression.EVERY_MINUTE)
  async sweepExpiredReservations(): Promise<void> {
    try {
      await this.expireDue(BookingStatus.HOLDING);
      await this.expireDue(BookingStatus.PAYMENT_PENDING);
    } catch (error) {
      this.logger.error(`Hold sweep failed: ${error.message}`, error.stack);
    }
  }

  private async expireDue(status: ExpirableStatus): Promise<void> {
    const now = new Date();
    const due = await this.bookingRepository.find({
      where:
        status === BookingStatus.HOLDING
          ? { status, holdExpiresAt: LessThanOrEqual(now) }
          : { status, paymentExpiresAt: LessThanOrEqual(now) },
      order: { id: 'ASC' },
      take: SWEEP_BATCH_SIZE,
    });

    if (due.length > 0) {
      this.logger.log(`Found ${due.length} overdue ${status} bookings`);
    }

    for (const booking of due) {
      await this.expireBooking(booking.id);
    }
  }

  /**
   * Locks the booking row, re-checks status and deadline (a confirm or cancel may
   * have won the race), then marks it EXPIRED and expires its active holds.
   */
  async expireBooking(bookingId: number): Promise<void> {
    try {
      const expired = await this.dataSource.transaction(async (manager) => {
        const booking = await manager.findOne(Booking, {
          where: { id: bookingId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!booking || !this.isOverdue(booking, new Date())) {
          return null;
        }

        assertTransition(booking.status, BookingStatus.EXPIRED);
        booking.status = BookingStatus.EXPIRED;
        await manager.save(Booking, booking);

        await manager.update(
          SeatHold,
          { bookingId: booking.id, status: SeatHoldStatus.ACTIVE },
          { status: SeatHoldStatus.EXPIRED },
        );

        return booking;
      });

      if (!expired) return;

      this.logger.log(`Expired booking ${expired.bookingRef}`);
      await this.eventsPublisher
        .publishExpired({
          bookingRef: expired.bookingRef,
          showId: expired.showId,
        })
        .catch((err) =>
          this.logger.error(`Failed to publish booking.expired: ${err.message}`),
        );
    } catch (error) {
      this.logger.error(
        `Failed to expire booking ${bookingId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private isOverdue(booking: Booking, now: Date): boolean {
    if (booking.status === BookingStatus.HOLDING) {
      return !!booking.holdExpiresAt && booking.holdExpiresAt <= now;
    }
    if (booking.status === BookingStatus.PAYMENT_PENDING) {
      return !!booking.paymentExpiresAt && booking.paymentExpiresAt <= now;
    }
    return false;
  }
}
