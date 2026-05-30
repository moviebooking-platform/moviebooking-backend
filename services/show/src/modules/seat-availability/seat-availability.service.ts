import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Show, ShowPrice, ShowStatus } from '../../entities';
import { throwError, encryptId } from '@moviebooking/common';
import { TheatreClient } from '../../clients/theatre.client';

@Injectable()
export class SeatAvailabilityService {
  private readonly logger = new Logger(SeatAvailabilityService.name);

  constructor(
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
    @InjectRepository(ShowPrice)
    private readonly showPriceRepository: Repository<ShowPrice>,
    private readonly theatreClient: TheatreClient,
  ) {}

  /** Returns seat map with availability status and pricing for a show. */
  async getAvailability(showId: number) {
    const show = await this.showRepository.findOne({ where: { id: showId } });

    if (!show || show.status !== ShowStatus.ACTIVE) {
      throwError('NOT_FOUND', 'Show not found');
    }

    // Get prices for this show
    const prices = await this.showPriceRepository.find({ where: { showId } });

    if (!prices.length) {
      throwError('BUSINESS_RULE_VIOLATION', 'Pricing not configured for this show');
    }

    // Build price map by seat type
    const priceMap = new Map<string, { amount: number; currency: string }>(
      prices.map(p => [p.seatType, { amount: p.amount, currency: p.currency }]),
    );

    // Fetch seats from Theatre Service
    const seats = await this.theatreClient.getScreenSeats(show.screenId);

    if (!seats || seats.length === 0) {
      throwError('NOT_FOUND', 'No seats found for this screen');
    }

    // TODO: Fetch bookings/holds from Booking Service (M6)
    // For now, all seats are AVAILABLE
    const soldSeatIds = new Set<number>();
    const heldSeatIds = new Set<number>();

    // Build seat availability response
    const seatData = seats.map(seat => {
      let status = 'AVAILABLE';
      if (soldSeatIds.has(seat.id)) status = 'SOLD';
      else if (heldSeatIds.has(seat.id)) status = 'HELD';

      const pricing = priceMap.get(seat.seatType);

      return {
        id: encryptId(seat.id),
        seatCode: seat.seatCode,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        seatType: seat.seatType,
        status,
        amount: pricing?.amount ?? 0,
        currency: pricing?.currency ?? 'GBP',
      };
    });

    // Build summary
    const summary = {
      total: seatData.length,
      available: seatData.filter(s => s.status === 'AVAILABLE').length,
      held: seatData.filter(s => s.status === 'HELD').length,
      sold: seatData.filter(s => s.status === 'SOLD').length,
    };

    return {
      showId: encryptId(show.id),
      screenId: encryptId(show.screenId),
      seats: seatData,
      summary,
    };
  }
}
