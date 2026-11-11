import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
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
import {
  LockToken,
  SeatLockContendedError,
  SeatLockService,
} from '../../redis/seat-lock.service';
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

/** SQL Server error numbers for unique constraint (2627) and unique index (2601) violations. */
const SQL_SERVER_DUPLICATE_KEY_ERRORS = [2601, 2627];

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

    let lockTokens: LockToken[] = [];

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
   * Phase 3: Creates booking, booking_seats, and seat_holds in one transaction.
   * Any error thrown inside the callback (including business errors) makes TypeORM
   * roll back exactly once and rethrow it unchanged, so callers see the real error.
   */
  private async createHoldTransaction(
    data: ValidatedHoldData,
  ): Promise<Booking> {
    let bookingId: number;

    try {
      bookingId = await this.dataSource.transaction(async (manager) => {
        await this.assertSeatsStillFree(manager, data);

        const bookingRef =
          await this.bookingRefGenerator.generateUniqueRef(manager);

        const booking = await manager.save(
          manager.create(Booking, {
            bookingRef,
            showId: data.showId,
            email: data.email,
            status: BookingStatus.HOLDING,
            totalAmountCents: data.totalAmountCents,
            currency: data.currency,
            holdExpiresAt: data.holdExpiresAt,
            paymentExpiresAt: null,
          }),
        );

        // Price snapshots
        await manager.save(
          data.seats.map((seat) =>
            manager.create(BookingSeat, {
              bookingId: booking.id,
              showId: data.showId,
              seatId: seat.seatId,
              seatType: seat.seatType,
              priceCents: seat.priceCents,
            }),
          ),
        );

        // Holds — the filtered unique index rejects a second ACTIVE hold per seat
        await manager.save(
          data.seats.map((seat) =>
            manager.create(SeatHold, {
              bookingId: booking.id,
              showId: data.showId,
              seatId: seat.seatId,
              status: SeatHoldStatus.ACTIVE,
              expiresAt: data.holdExpiresAt,
            }),
          ),
        );

        return booking.id;
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        this.logger.warn('Duplicate seat hold detected (filtered index)');
        throwError(
          'BUSINESS_RULE_VIOLATION',
          'One or more seats are already held by another booking',
        );
      }
      throw error;
    }

    return this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['seats', 'holds'],
    });
  }

  /** Re-checks inside the transaction that no requested seat is sold or actively held. */
  private async assertSeatsStillFree(
    manager: EntityManager,
    data: ValidatedHoldData,
  ): Promise<void> {
    const seatIds = data.seats.map((s) => s.seatId);

    const soldSeats = await manager
      .createQueryBuilder(BookingSeat, 'bs')
      .innerJoin(Booking, 'b', 'b.id = bs.booking_id')
      .where('bs.show_id = :showId', { showId: data.showId })
      .andWhere('bs.seat_id IN (:...seatIds)', { seatIds })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .select('bs.seat_id', 'seatId')
      .getRawMany<{ seatId: number }>();

    if (soldSeats.length > 0) {
      throwError(
        'BUSINESS_RULE_VIOLATION',
        `Seats ${soldSeats.map((s) => s.seatId).join(', ')} are already sold`,
      );
    }

    const heldSeats = await manager
      .createQueryBuilder(SeatHold, 'h')
      .where('h.show_id = :showId', { showId: data.showId })
      .andWhere('h.seat_id IN (:...seatIds)', { seatIds })
      .andWhere('h.status = :status', { status: SeatHoldStatus.ACTIVE })
      .andWhere('h.expires_at > :now', { now: new Date() })
      .select('h.seat_id', 'seatId')
      .getRawMany<{ seatId: number }>();

    if (heldSeats.length > 0) {
      throwError(
        'BUSINESS_RULE_VIOLATION',
        `Seats ${heldSeats.map((s) => s.seatId).join(', ')} are currently held`,
      );
    }
  }

  /** True for SQL Server unique constraint or unique index violations. */
  private isDuplicateKeyError(error: any): boolean {
    const errorNumber = error?.number ?? error?.driverError?.number;
    return SQL_SERVER_DUPLICATE_KEY_ERRORS.includes(errorNumber);
  }

  /**
   * Phase 2: Acquires Redis locks for all seats in sorted order to prevent deadlock.
   * Returns lock tokens on success, throws and releases all on failure.
   */
  private async acquireSeatsLocks(
    seatIds: number[],
    showId: number,
  ): Promise<LockToken[]> {
    // Sort seat IDs to prevent deadlock (always acquire in same order)
    const sortedSeatIds = [...seatIds].sort((a, b) => a - b);
    const acquiredTokens: LockToken[] = [];

    try {
      for (const seatId of sortedSeatIds) {
        const token = await this.seatLockService.acquire(showId, seatId);
        acquiredTokens.push(token);
      }
      return acquiredTokens;
    } catch (error) {
      this.logger.warn(
        `Lock acquisition failed, releasing ${acquiredTokens.length} locks`,
      );
      await this.releaseAllLocks(acquiredTokens);
      if (error instanceof SeatLockContendedError) {
        throwError(
          'BUSINESS_RULE_VIOLATION',
          'One or more seats are being reserved by another request',
        );
      }
      throw error;
    }
  }

  /** Phase 4: Releases all acquired Redis locks. Always called in finally block. */
  private async releaseAllLocks(tokens: LockToken[]): Promise<void> {
    if (!tokens || tokens.length === 0) return;

    await Promise.all(
      tokens.map((token) =>
        this.seatLockService.release(token).catch((err) => {
          this.logger.error(`Failed to release lock: ${err.message}`);
        }),
      ),
    );
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
      throwError(
        'BUSINESS_RULE_VIOLATION',
        'Show is not available for booking',
      );
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
      throwError(
        'SERVICE_UNAVAILABLE',
        'Unable to retrieve pricing information',
      );
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
