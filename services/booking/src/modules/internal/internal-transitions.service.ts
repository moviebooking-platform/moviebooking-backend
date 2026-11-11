import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  Booking,
  BookingSeat,
  SeatHold,
  BookingStatus,
  SeatHoldStatus,
} from '../../entities';
import { throwError } from '@moviebooking/common';
import { assertTransition } from '../bookings/booking-state';
import {
  BookingConfirmedEvent,
  BookingEventsPublisher,
} from '../../messaging/booking-events.publisher';

/**
 * Handles internal state transitions for Payment Service.
 *
 * Every transition runs inside dataSource.transaction(): business errors are thrown
 * from the callback, TypeORM rolls back once and rethrows them unchanged, so the
 * caller receives the intended 404/422 rather than a rollback error.
 */
@Injectable()
export class InternalTransitionsService {
  private readonly logger = new Logger(InternalTransitionsService.name);
  private readonly paymentWindowMinutes: number;
  private readonly maxReservationMinutes: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventsPublisher: BookingEventsPublisher,
    config: ConfigService,
  ) {
    this.paymentWindowMinutes = parseInt(
      config.get('PAYMENT_WINDOW_MINUTES', '10'),
      10,
    );
    this.maxReservationMinutes = parseInt(
      config.get('MAX_RESERVATION_MINUTES', '15'),
      10,
    );
  }

  /**
   * HOLDING → PAYMENT_PENDING. Sets the payment deadline and extends active holds to it.
   * Repeating the call on a PAYMENT_PENDING booking returns its current timing.
   */
  async markPaymentPending(bookingRef: string) {
    return this.dataSource.transaction(async (manager) => {
      const booking = await this.lockBooking(manager, bookingRef);

      if (booking.status === BookingStatus.PAYMENT_PENDING) {
        this.logger.debug(`Booking ${bookingRef} already in PAYMENT_PENDING`);
        return this.mapTimingResponse(booking);
      }

      if (booking.status !== BookingStatus.HOLDING) {
        throwError(
          'BUSINESS_RULE_VIOLATION',
          `Booking is ${booking.status}, cannot mark payment pending`,
        );
      }

      const now = new Date();
      if (booking.holdExpiresAt && booking.holdExpiresAt <= now) {
        throwError('BUSINESS_RULE_VIOLATION', 'Hold has already expired');
      }

      const [seatCount, activeHoldCount] = await Promise.all([
        manager.count(BookingSeat, { where: { bookingId: booking.id } }),
        manager.count(SeatHold, {
          where: { bookingId: booking.id, status: SeatHoldStatus.ACTIVE },
        }),
      ]);

      if (activeHoldCount !== seatCount) {
        throwError(
          'BUSINESS_RULE_VIOLATION',
          'Not all seats have active holds',
        );
      }

      const paymentExpiresAt = this.calculatePaymentDeadline(booking, now);
      if (paymentExpiresAt <= now) {
        throwError(
          'BUSINESS_RULE_VIOLATION',
          'Payment deadline would be in the past',
        );
      }

      assertTransition(booking.status, BookingStatus.PAYMENT_PENDING);
      booking.status = BookingStatus.PAYMENT_PENDING;
      booking.paymentExpiresAt = paymentExpiresAt;
      await manager.save(Booking, booking);

      await manager.update(
        SeatHold,
        { bookingId: booking.id, status: SeatHoldStatus.ACTIVE },
        { expiresAt: paymentExpiresAt },
      );

      this.logger.log(
        `Marked booking ${bookingRef} as PAYMENT_PENDING, deadline: ${paymentExpiresAt.toISOString()}`,
      );
      return this.mapTimingResponse(booking);
    });
  }

  /**
   * PAYMENT_PENDING → CONFIRMED after verified payment.
   * A payment that arrives after the deadline moves the booking to PENDING_REVIEW instead
   * and releases its holds, so the seats become available again.
   * Repeating the call on a CONFIRMED booking returns its current timing.
   * Any other status (including EXPIRED) is rejected with 422.
   */
  async confirmBooking(bookingRef: string) {
    const { response, confirmed } = await this.dataSource.transaction(
      async (manager) => {
        const booking = await this.lockBooking(manager, bookingRef);

        if (booking.status === BookingStatus.CONFIRMED) {
          this.logger.debug(`Booking ${bookingRef} already CONFIRMED`);
          return { response: this.mapTimingResponse(booking), confirmed: null };
        }

        if (booking.status !== BookingStatus.PAYMENT_PENDING) {
          throwError(
            'BUSINESS_RULE_VIOLATION',
            `Cannot confirm booking with status ${booking.status}`,
          );
        }

        if (
          booking.paymentExpiresAt &&
          booking.paymentExpiresAt <= new Date()
        ) {
          assertTransition(booking.status, BookingStatus.PENDING_REVIEW);
          booking.status = BookingStatus.PENDING_REVIEW;
          booking.needsReviewReason = 'VERIFIED_PAYMENT_AFTER_EXPIRY';
          await manager.save(Booking, booking);

          // The reservation window has passed, so free the seats. Otherwise the
          // filtered unique index on ACTIVE holds would block them indefinitely,
          // because the expiry sweep only handles HOLDING and PAYMENT_PENDING.
          await manager.update(
            SeatHold,
            { bookingId: booking.id, status: SeatHoldStatus.ACTIVE },
            { status: SeatHoldStatus.RELEASED },
          );
          this.logger.warn(
            `Booking ${bookingRef} paid after expiry, marked PENDING_REVIEW`,
          );
          return { response: this.mapTimingResponse(booking), confirmed: null };
        }

        assertTransition(booking.status, BookingStatus.CONFIRMED);
        booking.status = BookingStatus.CONFIRMED;
        await manager.save(Booking, booking);

        await manager.update(
          SeatHold,
          { bookingId: booking.id, status: SeatHoldStatus.ACTIVE },
          { status: SeatHoldStatus.RELEASED },
        );

        // Build the event while the seat rows are read under the same lock, so nothing
        // that runs after commit can fail before publishing.
        const seats = await manager.find(BookingSeat, {
          where: { bookingId: booking.id },
          order: { seatId: 'ASC' },
        });

        return {
          response: this.mapTimingResponse(booking),
          confirmed: this.buildConfirmedEvent(booking, seats),
        };
      },
    );

    if (confirmed) {
      this.logger.log(`Booking ${bookingRef} confirmed`);
      await this.eventsPublisher.publishConfirmed(confirmed).catch((err) => {
        this.logger.error(
          `Failed to publish booking.confirmed: ${err.message}`,
        );
      });
    }

    return response;
  }

  private buildConfirmedEvent(
    booking: Booking,
    seats: BookingSeat[],
  ): BookingConfirmedEvent {
    return {
      bookingRef: booking.bookingRef,
      showId: booking.showId,
      email: booking.email,
      seats: seats.map((s) => ({
        seatCode: s.seatCode,
        seatType: s.seatType,
        priceCents: s.priceCents,
      })),
      totalAmountCents: booking.totalAmountCents,
      currency: booking.currency,
    };
  }

  /**
   * HOLDING or PAYMENT_PENDING → FAILED (explicit payment failure from Payment Service).
   * Repeating the call on a FAILED booking returns its current timing.
   */
  async failBooking(bookingRef: string) {
    const { response, failed } = await this.dataSource.transaction(
      async (manager) => {
        const booking = await this.lockBooking(manager, bookingRef);

        if (booking.status === BookingStatus.FAILED) {
          this.logger.debug(`Booking ${bookingRef} already FAILED`);
          return { response: this.mapTimingResponse(booking), failed: null };
        }

        if (
          booking.status !== BookingStatus.HOLDING &&
          booking.status !== BookingStatus.PAYMENT_PENDING
        ) {
          throwError(
            'BUSINESS_RULE_VIOLATION',
            `Cannot fail booking with status ${booking.status}`,
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

        return { response: this.mapTimingResponse(booking), failed: booking };
      },
    );

    if (failed) {
      this.logger.log(`Booking ${bookingRef} marked as FAILED`);
      await this.eventsPublisher
        .publishFailed({ bookingRef: failed.bookingRef, showId: failed.showId })
        .catch((err) => {
          this.logger.error(`Failed to publish booking.failed: ${err.message}`);
        });
    }

    return response;
  }

  /** Loads the booking with an exclusive row lock, or throws NOT_FOUND. */
  private async lockBooking(
    manager: EntityManager,
    bookingRef: string,
  ): Promise<Booking> {
    const booking = await manager.findOne(Booking, {
      where: { bookingRef },
      lock: { mode: 'pessimistic_write' },
    });

    if (!booking) {
      throwError('NOT_FOUND', 'Booking not found');
    }

    return booking;
  }

  /** The earlier of (now + payment window) and (created + maximum reservation time). */
  private calculatePaymentDeadline(booking: Booking, now: Date): Date {
    const createdAt =
      booking.createdAt instanceof Date
        ? booking.createdAt
        : new Date(booking.createdAt);
    const maxDeadline = new Date(
      createdAt.getTime() + this.maxReservationMinutes * 60 * 1000,
    );
    const paymentWindowDeadline = new Date(
      now.getTime() + this.paymentWindowMinutes * 60 * 1000,
    );
    return paymentWindowDeadline < maxDeadline
      ? paymentWindowDeadline
      : maxDeadline;
  }

  private mapTimingResponse(booking: Booking) {
    const now = new Date();
    const activeDeadline = booking.paymentExpiresAt || booking.holdExpiresAt;
    const activeExpiresAt = activeDeadline
      ? activeDeadline.toISOString()
      : null;
    const remainingSeconds = activeDeadline
      ? Math.max(
          0,
          Math.floor((activeDeadline.getTime() - now.getTime()) / 1000),
        )
      : 0;

    return {
      bookingRef: booking.bookingRef,
      status: booking.status,
      holdExpiresAt: booking.holdExpiresAt?.toISOString() || null,
      paymentExpiresAt: booking.paymentExpiresAt?.toISOString() || null,
      activeExpiresAt,
      remainingSeconds,
    };
  }
}
