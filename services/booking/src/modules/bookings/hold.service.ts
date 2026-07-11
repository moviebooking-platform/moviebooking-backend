import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { decryptId, throwError } from '@moviebooking/common';
import { ShowStatus, SeatStatus } from '@moviebooking/database';
import { ShowClient } from '../../clients/show.client';
import { TheatreClient } from '../../clients/theatre.client';
import { SeatLockService } from '../../redis/seat-lock.service';
import { HoldSeatsDto } from './dto/hold-seats.dto';

/** Validated seat data prepared for hold transaction. */
interface PreparedSeat {
  seatId: number;
  seatCode: string;
  seatType: string;
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
    private readonly configService: ConfigService,
    private readonly showClient: ShowClient,
    private readonly theatreClient: TheatreClient,
    private readonly seatLockService: SeatLockService,
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
        seatType: seat.seatType,
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
