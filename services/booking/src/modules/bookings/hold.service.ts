import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { decryptId, throwError } from '@moviebooking/common';
import {
  ShowStatus,
  SeatStatus,
  SeatType,
  Booking,
  BookingSeat,
  SeatHold,
  BookingStatus,
  SeatHoldStatus,
} from '@moviebooking/database';
import { ShowClient } from '../../clients/show.client';
import { TheatreClient } from '../../clients/theatre.client';
import { SeatLockService } from '../../redis/seat-lock.service';
import { BookingRefGenerator } from './booking-ref.generator';
import { HoldSeatsDto } from './dto/hold-seats.dto';

/** Validated seat data prepared for hold transaction. */
interface PreparedSeat {
  seatId: number;
  seatCode: string;
  seatType: SeatType;
  priceCents: number;
}

/** Result of Phase 1 validation, ready for Phase 2 locking. */
interface ValidatedHoldData {
  showId: number;
  screenId: number;
  email: string;
  seats: PreparedSeat[];
  totalAmountCents: number;
  currency: string;
  holdExpiresAt: Date;
}

/**
 * Handles seat hold creation with four-phase flow:
 * Phase 1: Pre-transaction validation 
 * Phase 2: Redis lock acquisition
 * Phase 3: Database transaction
 * Phase 4: Lock release
 */
@Injectable()
export class HoldService {
  private readonly logger = new Logger(HoldService.name);
  private readonly maxSeatsPerBooking: number;
  private readonly holdLifetimeMinutes: number;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingSeat)
    private readonly bookingSeatRepo: Repository<BookingSeat>,
    @InjectRepository(SeatHold)
    private readonly seatHoldRepo: Repository<SeatHold>,
    private readonly configService: ConfigService,
    private readonly showClient: ShowClient,
    private readonly theatreClient: TheatreClient,
    private readonly seatLockService: SeatLockService,
    private readonly bookingRefGenerator: BookingRefGenerator,
  ) {
    this.maxSeatsPerBooking = this.configService.get<number>(
      'MAX_SEATS_PER_BOOKING',
      10,
    );
    this.holdLifetimeMinutes = this.configService.get<number>(
      'HOLD_LIFETIME_MINUTES',
      5,
    );
  }

  /**
   * Creates a seat hold with 4-phase flow: validate → lock → transaction → cleanup.
   * This is the main entry point for hold creation.
   */
  async holdSeats(dto: HoldSeatsDto): Promise<Booking> {
    this.logger.log(`Creating hold for ${dto.seatIds.length} seats`);

    // Phase 1: Pre-transaction validation
    const validatedData = await this.validateHoldRequest(dto);

    let lockTokens: any[] = [];

    try {
      // Phase 2: Acquire Redis locks
      lockTokens = await this.acquireSeatsLocks(
        validatedData.seats.map((s) => s.seatId),
        validatedData.showId,
      );

      // Phase 3: Database transaction
      const booking = await this.createHoldTransaction(validatedData);

      this.logger.log(
        `Hold created successfully: ${booking.bookingRef} (${booking.id})`,
      );
      return booking;
    } finally {
      // Phase 4: Always release locks (even if transaction failed)
      await this.releaseAllLocks(lockTokens);
    }
  }

  /**
   * Phase 3: Creates booking, booking_seats, and seat_holds in a transaction.
   * Re-checks availability before insert to catch race conditions.
   */
  private async createHoldTransaction(
    data: ValidatedHoldData,
  ): Promise<Booking> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Re-check: Are any seats now SOLD (confirmed booking)?
      const soldSeats = await queryRunner.manager
        .createQueryBuilder(BookingSeat, 'bs')
        .innerJoin(Booking, 'b', 'b.id = bs.booking_id')
        .where('bs.show_id = :showId', { showId: data.showId })
        .andWhere('bs.seat_id IN (:...seatIds)', {
          seatIds: data.seats.map((s) => s.seatId),
        })
        .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
        .select('bs.seat_id', 'seatId')
        .getRawMany<{ seatId: number }>();

      if (soldSeats.length > 0) {
        await queryRunner.rollbackTransaction();
        throwError(
          'BUSINESS_RULE_VIOLATION',
          `Seats ${soldSeats.map((s) => s.seatId).join(', ')} are already sold`,
        );
      }

      // Re-check: Are any seats currently HELD (active hold)?
      const heldSeats = await queryRunner.manager
        .createQueryBuilder(SeatHold, 'h')
        .where('h.show_id = :showId', { showId: data.showId })
        .andWhere('h.seat_id IN (:...seatIds)', {
          seatIds: data.seats.map((s) => s.seatId),
        })
        .andWhere('h.status = :status', { status: SeatHoldStatus.ACTIVE })
        .andWhere('h.expires_at > :now', { now: new Date() })
        .select('h.seat_id', 'seatId')
        .getRawMany<{ seatId: number }>();

      if (heldSeats.length > 0) {
        await queryRunner.rollbackTransaction();
        throwError(
          'BUSINESS_RULE_VIOLATION',
          `Seats ${heldSeats.map((s) => s.seatId).join(', ')} are currently held`,
        );
      }

      // Generate unique booking reference
      const bookingRef =
        await this.bookingRefGenerator.generateUniqueRef(queryRunner.manager);

      // Insert booking
      const booking = queryRunner.manager.create(Booking, {
        bookingRef,
        showId: data.showId,
        email: data.email,
        status: BookingStatus.HOLDING,
        totalAmountCents: data.totalAmountCents,
        currency: data.currency,
        holdExpiresAt: data.holdExpiresAt,
      });
      await queryRunner.manager.save(booking);

      // Insert booking_seats (price snapshots)
      const bookingSeats = data.seats.map((seat) =>
        queryRunner.manager.create(BookingSeat, {
          bookingId: booking.id,
          showId: data.showId,
          seatId: seat.seatId,
          seatType: seat.seatType,
          priceCents: seat.priceCents,
        }),
      );
      await queryRunner.manager.save(bookingSeats);

      // Insert seat_holds
      const seatHolds = data.seats.map((seat) =>
        queryRunner.manager.create(SeatHold, {
          bookingId: booking.id,
          showId: data.showId,
          seatId: seat.seatId,
          status: SeatHoldStatus.ACTIVE,
          expiresAt: data.holdExpiresAt,
        }),
      );
      await queryRunner.manager.save(seatHolds);

      await queryRunner.commitTransaction();

      this.logger.debug(
        `Transaction committed: booking ${bookingRef}, ${bookingSeats.length} seats`,
      );

      // Load the full booking with relationships
      return await this.bookingRepo.findOne({
        where: { id: booking.id },
        relations: ['seats', 'holds'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Handle filtered-index violation (seat already held)
      if (this.isDuplicateConstraintError(error)) {
        this.logger.warn('Duplicate seat hold detected (filtered index)');
        throwError(
          'BUSINESS_RULE_VIOLATION',
          'One or more seats are already held by another booking',
        );
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** Checks if error is a unique constraint violation. */
  private isDuplicateConstraintError(error: any): boolean {
    return (
      error.code === 'ER_DUP_ENTRY' || // MySQL
      error.code === '23505' || // PostgreSQL
      error.number === 2601 || // SQL Server unique index
      error.number === 2627 || // SQL Server unique constraint
      error.message?.includes('UNIQUE constraint') ||
      error.message?.includes('duplicate key')
    );
  }

  /**
   * Phase 2: Acquires Redis locks for all seats in sorted order to prevent deadlock.
   * Returns lock tokens on success, throws and releases all on failure.
   */
  private async acquireSeatsLocks(
    seatIds: number[],
    showId: number,
  ): Promise<any[]> {
    // Sort seat IDs to prevent deadlock (always acquire in same order)
    const sortedSeatIds = [...seatIds].sort((a, b) => a - b);
    const acquiredTokens: any[] = [];

    try {
      for (const seatId of sortedSeatIds) {
        this.logger.debug(`Acquiring lock for seat ${seatId} in show ${showId}`);
        const token = await this.seatLockService.acquire(showId, seatId);
        acquiredTokens.push(token);
      }

      this.logger.debug(
        `Successfully acquired ${acquiredTokens.length} seat locks`,
      );
      return acquiredTokens;
    } catch (error) {
      // Release all locks acquired so far
      this.logger.warn(
        `Lock acquisition failed, releasing ${acquiredTokens.length} locks`,
      );
      await this.releaseAllLocks(acquiredTokens);
      throw error;
    }
  }

  /**
   * Phase 4: Releases all acquired Redis locks. Always called in finally block.
   */
  private async releaseAllLocks(tokens: any[]): Promise<void> {
    if (!tokens || tokens.length === 0) return;

    await Promise.all(
      tokens.map((token) =>
        this.seatLockService.release(token).catch((err) => {
          this.logger.error(`Failed to release lock: ${err.message}`);
        }),
      ),
    );

    this.logger.debug(`Released ${tokens.length} seat locks`);
  }

  /**
   * Phase 1: Validates hold request before acquiring locks or starting transaction.
   * Throws BUSINESS_RULE_VIOLATION or SERVICE_UNAVAILABLE on failure.
   */
  async validateHoldRequest(dto: HoldSeatsDto): Promise<ValidatedHoldData> {
    // Decrypt and validate IDs
    const showId = decryptId(dto.showId);
    if (!showId) {
      throwError('VALIDATION_ERROR', 'Invalid show ID');
    }

    const seatIds = dto.seatIds.map((id) => {
      const decrypted = decryptId(id);
      if (!decrypted) {
        throwError('VALIDATION_ERROR', `Invalid seat ID: ${id}`);
      }
      return decrypted;
    });

    // Validate seat count
    if (seatIds.length > this.maxSeatsPerBooking) {
      throwError(
        'VALIDATION_ERROR',
        `Cannot book more than ${this.maxSeatsPerBooking} seats at once`,
      );
    }

    // Check for duplicate seat IDs (after decryption)
    const uniqueSeats = new Set(seatIds);
    if (uniqueSeats.size !== seatIds.length) {
      throwError('VALIDATION_ERROR', 'Duplicate seat IDs are not allowed');
    }

    // Step 2: Validate show exists and is ACTIVE
    const show = await this.showClient.getShow(showId);
    if (!show) {
      throwError('NOT_FOUND', 'Show not found');
    }
    if (show.status !== ShowStatus.ACTIVE) {
      throwError('BUSINESS_RULE_VIOLATION', 'Show is not available for booking');
    }

    // Step 3: Get screen seats and validate seat membership
    const screenSeats = await this.theatreClient.getScreenSeats(show.screenId);
    if (!screenSeats || screenSeats.length === 0) {
      throwError('SERVICE_UNAVAILABLE', 'Unable to retrieve seat information');
    }

    const screenSeatMap = new Map(
      screenSeats
        .filter((s) => s.status === SeatStatus.ACTIVE)
        .map((s) => [s.id, s]),
    );

    // Validate every requested seat belongs to the screen
    const preparedSeats: PreparedSeat[] = [];
    for (const seatId of seatIds) {
      const seat = screenSeatMap.get(seatId);
      if (!seat) {
        throwError(
          'BUSINESS_RULE_VIOLATION',
          `Seat ${seatId} does not belong to this show's screen or is inactive`,
        );
      }
      preparedSeats.push({
        seatId: seat.id,
        seatCode: seat.seatCode,
        seatType: seat.seatType as SeatType,
        priceCents: 0, // Will be filled with price
      });
    }

    // Step 4: Get prices and validate every seat type has a price
    const prices = await this.showClient.getPrices(showId);
    if (!prices || prices.length === 0) {
      throwError('SERVICE_UNAVAILABLE', 'Unable to retrieve pricing information');
    }

    const priceMap = new Map(prices.map((p) => [p.seatType, p.amount]));
    const currency = prices[0]?.currency || 'GBP';

    // Step 5: Compute per-seat price snapshots and total
    let totalAmountCents = 0;
    for (const seat of preparedSeats) {
      const price = priceMap.get(seat.seatType);
      if (price === undefined) {
        throwError(
          'BUSINESS_RULE_VIOLATION',
          `No price found for seat type: ${seat.seatType}`,
        );
      }
      seat.priceCents = price;
      totalAmountCents += price;
    }

    // Calculate hold expiration time
    const holdExpiresAt = new Date(
      Date.now() + this.holdLifetimeMinutes * 60 * 1000,
    );

    this.logger.debug(
      `Phase 1 validation passed for show ${showId}: ${preparedSeats.length} seats, total ${totalAmountCents} ${currency}`,
    );

    return {
      showId,
      screenId: show.screenId,
      email: dto.email,
      seats: preparedSeats,
      totalAmountCents,
      currency,
      holdExpiresAt,
    };
  }
}
