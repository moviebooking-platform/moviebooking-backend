import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateId, throwError } from '@moviebooking/common';
import { Booking } from '@moviebooking/database';
import { EntityManager } from 'typeorm';

const BOOKING_REF_LENGTH = 10;

/** Produces collision-free public booking references. */
@Injectable()
export class BookingRefGenerator {
  private readonly maxRetries: number;

  constructor(config: ConfigService) {
    this.maxRetries = parseInt(
      config.get<string>('BOOKING_REF_MAX_RETRIES', '3'),
      10,
    );
  }

  /**
   * Returns an unused booking_ref. Pass the transaction's EntityManager so the
   * uniqueness check sees the same rows the insert will write against.
   * Throws INTERNAL_ERROR if every attempt collides — the idx_bookings_ref unique
   * index is the final backstop should two transactions still race on one ref.
   */
  async generateUniqueRef(manager: EntityManager): Promise<string> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const ref = generateId(BOOKING_REF_LENGTH);
      const existing = await manager.count(Booking, {
        where: { bookingRef: ref },
      });
      if (existing === 0) {
        return ref;
      }
    }

    throwError(
      'INTERNAL_ERROR',
      `Could not generate a unique booking reference after ${this.maxRetries} attempts`,
    );
  }
}
