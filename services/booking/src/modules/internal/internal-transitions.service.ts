import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
import { BookingEventsPublisher } from '../../messaging/booking-events.publisher';

/** Handles internal state transitions for Payment Service. */
@Injectable()
export class InternalTransitionsService {
  private readonly logger = new Logger('InternalTransitionsService');
  private readonly paymentWindowMinutes: number;
  private readonly maxReservationMinutes: number;

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingSeat)
    private readonly bookingSeatRepository: Repository<BookingSeat>,
    @InjectRepository(SeatHold)
    private readonly seatHoldRepository: Repository<SeatHold>,
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
   * Atomically transitions booking from HOLDING to PAYMENT_PENDING.
   * Calculates payment deadline and extends active holds to match it.
   */
  async markPaymentPending(bookingRef: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { bookingRef },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        await queryRunner.rollbackTransaction();
        throwError('NOT_FOUND', 'Booking not found');
        return;
      }

      // Require HOLDING status
      if (booking.status !== BookingStatus.HOLDING) {
        await queryRunner.rollbackTransaction();
        if (booking.status === BookingStatus.PAYMENT_PENDING) {
          // Idempotent: already in payment pending
          this.logger.debug(`Booking ${bookingRef} already in PAYMENT_PENDING`);
          return this.mapTimingResponse(booking);
        }
        throwError(
          'BUSINESS_RULE_VIOLATION',
          `Booking is ${booking.status}, cannot mark payment pending`,
        );
        return;
      }

      // Require unelapsed hold expiry
      const now = new Date();
      if (booking.holdExpiresAt && booking.holdExpiresAt <= now) {
        await queryRunner.rollbackTransaction();
        throwError('BUSINESS_RULE_VIOLATION', 'Hold has already expired');
        return;
      }

      // Fetch all booking seats and their active holds
      const bookingSeats = await queryRunner.manager.find(BookingSeat, {
        where: { bookingId: booking.id },
      });

      const holds = await queryRunner.manager.find(SeatHold, {
        where: {
          bookingId: booking.id,
          status: SeatHoldStatus.ACTIVE,
        },
      });

      // Require one active hold per seat
      if (holds.length !== bookingSeats.length) {
        await queryRunner.rollbackTransaction();
        throwError(
          'BUSINESS_RULE_VIOLATION',
          'Not all seats have active holds',
        );
        return;
      }

      // Calculate payment deadline
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
      const paymentExpiresAt =
        paymentWindowDeadline < maxDeadline
          ? paymentWindowDeadline
          : maxDeadline;

      // Require payment deadline is in the future
      if (paymentExpiresAt <= now) {
        await queryRunner.rollbackTransaction();
        throwError(
          'BUSINESS_RULE_VIOLATION',
          'Payment deadline would be in the past',
        );
        return;
      }

      // Assert valid transition
      assertTransition(booking.status, BookingStatus.PAYMENT_PENDING);

      // Apply transition
      booking.status = BookingStatus.PAYMENT_PENDING;
      booking.paymentExpiresAt = paymentExpiresAt;
      await queryRunner.manager.save(Booking, booking);

      // Extend all active holds to payment deadline
      for (const hold of holds) {
        hold.expiresAt = paymentExpiresAt;
        await queryRunner.manager.save(SeatHold, hold);
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `Marked booking ${bookingRef} as PAYMENT_PENDING, deadline: ${paymentExpiresAt.toISOString()}`,
      );

      return this.mapTimingResponse(booking);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Map booking to timing response.
   */
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

  /**
   * Confirms a booking after verified payment.
   * Handles PAYMENT_PENDING and idempotent CONFIRMED.
   * Routes EXPIRED with verified payment to PENDING_REVIEW.
   */
  async confirmBooking(bookingRef: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { bookingRef },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        await queryRunner.rollbackTransaction();
        throwError('NOT_FOUND', 'Booking not found');
        return;
      }

      // Idempotent: already confirmed
      if (booking.status === BookingStatus.CONFIRMED) {
        await queryRunner.rollbackTransaction();
        this.logger.debug(`Booking ${bookingRef} already CONFIRMED`);
        return this.mapTimingResponse(booking);
      }

      // Allow PAYMENT_PENDING or handle EXPIRED race
      const now = new Date();
      if (booking.status === BookingStatus.PAYMENT_PENDING) {
        // Normal flow: verify deadline
        if (booking.paymentExpiresAt && booking.paymentExpiresAt <= now) {
          // Payment succeeded but after deadline - route to review
          booking.status = BookingStatus.PENDING_REVIEW;
          booking.needsReviewReason = 'VERIFIED_PAYMENT_AFTER_EXPIRY';
          await queryRunner.manager.save(Booking, booking);
          await queryRunner.commitTransaction();
          this.logger.warn(
            `Booking ${bookingRef} confirmed after expiry, marked PENDING_REVIEW`,
          );
          return this.mapTimingResponse(booking);
        }

        // Normal case: mark confirmed
        assertTransition(booking.status, BookingStatus.CONFIRMED);
        booking.status = BookingStatus.CONFIRMED;
        await queryRunner.manager.save(Booking, booking);

        // Release holds as complete
        await queryRunner.manager.update(
          SeatHold,
          { bookingId: booking.id, status: SeatHoldStatus.ACTIVE },
          { status: SeatHoldStatus.RELEASED },
        );

        await queryRunner.commitTransaction();
        this.logger.log(`Booking ${bookingRef} confirmed`);

        // Publish event
        await this.eventsPublisher
          .publishConfirmed({
            bookingRef: booking.bookingRef,
            showId: booking.showId,
            email: booking.email,
            seats: booking.seats.map((s) => ({
              seatCode: `${s.seatId}`,
              seatType: s.seatType,
              priceCents: s.priceCents,
            })),
            totalAmountCents: booking.totalAmountCents,
            currency: booking.currency,
          })
          .catch((err) => {
            this.logger.error(
              `Failed to publish booking.confirmed: ${err.message}`,
            );
          });

        return this.mapTimingResponse(booking);
      }

      // Reject other statuses
      await queryRunner.rollbackTransaction();
      throwError(
        'BUSINESS_RULE_VIOLATION',
        `Cannot confirm booking with status ${booking.status}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Marks booking as FAILED (explicit payment failure from Payment Service).
   */
  async failBooking(bookingRef: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { bookingRef },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        await queryRunner.rollbackTransaction();
        throwError('NOT_FOUND', 'Booking not found');
        return;
      }

      // Idempotent: already failed
      if (booking.status === BookingStatus.FAILED) {
        await queryRunner.rollbackTransaction();
        this.logger.debug(`Booking ${bookingRef} already FAILED`);
        return this.mapTimingResponse(booking);
      }

      // Allow HOLDING or PAYMENT_PENDING
      if (
        booking.status !== BookingStatus.HOLDING &&
        booking.status !== BookingStatus.PAYMENT_PENDING
      ) {
        await queryRunner.rollbackTransaction();
        throwError(
          'BUSINESS_RULE_VIOLATION',
          `Cannot fail booking with status ${booking.status}`,
        );
        return;
      }

      // Mark as failed
      assertTransition(booking.status, BookingStatus.FAILED);
      booking.status = BookingStatus.FAILED;
      await queryRunner.manager.save(Booking, booking);

      // Release active holds
      await queryRunner.manager.update(
        SeatHold,
        { bookingId: booking.id, status: SeatHoldStatus.ACTIVE },
        { status: SeatHoldStatus.RELEASED },
      );

      await queryRunner.commitTransaction();
      this.logger.log(`Booking ${bookingRef} marked as FAILED`);

      // Publish event
      await this.eventsPublisher
        .publishFailed({
          bookingRef: booking.bookingRef,
          showId: booking.showId,
        })
        .catch((err) => {
          this.logger.error(`Failed to publish booking.failed: ${err.message}`);
        });

      return this.mapTimingResponse(booking);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
