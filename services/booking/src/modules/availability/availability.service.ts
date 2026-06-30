import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { encryptId, throwError } from '@moviebooking/common';
import {
  Booking,
  BookingSeat,
  SeatHold,
  BookingStatus,
  SeatHoldStatus,
  SeatStatus,
  ShowStatus,
  ShowSeatStatus,
} from '@moviebooking/database';
import { ShowClient, PriceDto } from '../../clients/show.client';
import { TheatreClient, SeatDto } from '../../clients/theatre.client';
import {
  AvailabilityResponse,
  AvailabilitySeat,
} from './dto/availability-response.dto';

const DEFAULT_CURRENCY = 'GBP';

/** Computes the seat map for a show: AVAILABLE / HELD / SOLD with snapshot prices. */
@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(BookingSeat)
    private readonly bookingSeatRepo: Repository<BookingSeat>,
    @InjectRepository(SeatHold)
    private readonly seatHoldRepo: Repository<SeatHold>,
    private readonly showClient: ShowClient,
    private readonly theatreClient: TheatreClient,
  ) {}

  /** Returns the seat map for a show. NOT_FOUND if the show is missing or inactive. */
  async getAvailability(showId: number): Promise<AvailabilityResponse> {
    // A SERVICE_UNAVAILABLE thrown by the client propagates; only a real 404 returns null.
    const show = await this.showClient.getShow(showId);
    if (!show || show.status !== ShowStatus.ACTIVE) {
      throwError('NOT_FOUND', 'Show not found');
    }

    const prices = (await this.showClient.getPrices(showId)) ?? [];
    const priceByType = this.buildPriceMap(prices);
    const currency = prices[0]?.currency ?? DEFAULT_CURRENCY;

    const seats =
      (await this.theatreClient.getScreenSeats(show.screenId)) ?? [];
    const activeSeats = seats.filter((s) => s.status === SeatStatus.ACTIVE);

    const [soldSeatIds, heldSeatIds] = await Promise.all([
      this.findSoldSeatIds(showId),
      this.findHeldSeatIds(showId),
    ]);

    const mapped = activeSeats.map((seat) =>
      this.mapSeat(seat, soldSeatIds, heldSeatIds, priceByType, currency),
    );

    return {
      showId: encryptId(showId),
      screenId: encryptId(show.screenId),
      seats: mapped,
      summary: this.buildSummary(mapped),
    };
  }

  /** Seat IDs sold to a CONFIRMED booking for this show. Single batch query. */
  private async findSoldSeatIds(showId: number): Promise<Set<number>> {
    const rows = await this.bookingSeatRepo
      .createQueryBuilder('bs')
      .innerJoin(Booking, 'b', 'b.id = bs.booking_id')
      .select('bs.seat_id', 'seatId')
      .where('bs.show_id = :showId', { showId })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .getRawMany<{ seatId: number }>();
    return new Set(rows.map((r) => r.seatId));
  }

  /**
   * Seat IDs with a live hold. The `expires_at > now` predicate enforces lazy expiry,
   * so an expired-but-unswept hold is not counted as held. Single batch query.
   */
  private async findHeldSeatIds(showId: number): Promise<Set<number>> {
    const rows = await this.seatHoldRepo
      .createQueryBuilder('h')
      .select('h.seat_id', 'seatId')
      .where('h.show_id = :showId', { showId })
      .andWhere('h.status = :status', { status: SeatHoldStatus.ACTIVE })
      .andWhere('h.expires_at > :now', { now: new Date() })
      .getRawMany<{ seatId: number }>();
    return new Set(rows.map((r) => r.seatId));
  }

  private buildPriceMap(prices: PriceDto[]): Map<string, number> {
    return new Map(prices.map((p) => [p.seatType, p.amount]));
  }

  private mapSeat(
    seat: SeatDto,
    sold: Set<number>,
    held: Set<number>,
    priceByType: Map<string, number>,
    currency: string,
  ): AvailabilitySeat {
    return {
      seatId: encryptId(seat.id),
      seatCode: seat.seatCode,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      seatType: seat.seatType,
      status: this.resolveStatus(seat.id, sold, held),
      priceCents: priceByType.get(seat.seatType) ?? 0,
      currency,
    };
  }

  /** Precedence: SOLD over HELD over AVAILABLE. */
  private resolveStatus(
    seatId: number,
    sold: Set<number>,
    held: Set<number>,
  ): ShowSeatStatus {
    if (sold.has(seatId)) return ShowSeatStatus.SOLD;
    if (held.has(seatId)) return ShowSeatStatus.HELD;
    return ShowSeatStatus.AVAILABLE;
  }

  private buildSummary(seats: AvailabilitySeat[]) {
    return {
      total: seats.length,
      available: seats.filter((s) => s.status === ShowSeatStatus.AVAILABLE)
        .length,
      held: seats.filter((s) => s.status === ShowSeatStatus.HELD).length,
      sold: seats.filter((s) => s.status === ShowSeatStatus.SOLD).length,
    };
  }
}
