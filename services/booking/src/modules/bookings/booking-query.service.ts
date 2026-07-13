import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { throwError } from '@moviebooking/common';
import { Booking } from '@moviebooking/database';

/** Queries bookings by reference for guest polling. */
@Injectable()
export class BookingQueryService {
  private readonly logger = new Logger(BookingQueryService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  /** Fetches booking by reference with seats and holds. Returns null if not found. */
  async findByReference(bookingRef: string): Promise<Booking | null> {
    this.logger.debug(`Fetching booking: ${bookingRef}`);

    const booking = await this.bookingRepo.findOne({
      where: { bookingRef },
      relations: ['seats', 'holds'],
    });

    if (!booking) {
      this.logger.debug(`Booking not found: ${bookingRef}`);
      return null;
    }

    this.logger.debug(`Found booking ${bookingRef}, status: ${booking.status}`);
    return booking;
  }

  /** Gets booking by reference or throws NOT_FOUND. */
  async getByReferenceOrFail(bookingRef: string): Promise<Booking> {
    const booking = await this.findByReference(bookingRef);

    if (!booking) {
      throwError('NOT_FOUND', `Booking ${bookingRef} not found`);
    }

    return booking;
  }
}
