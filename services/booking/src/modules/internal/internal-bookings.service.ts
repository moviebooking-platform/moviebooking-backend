import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../entities';
import { throwError } from '@moviebooking/common';
import { mapReservationTiming } from '../bookings/reservation-timing.mapper';

/** Internal service for Payment Service integration. */
@Injectable()
export class InternalBookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  /** Returns raw booking data for Payment Service. */
  async getByReference(bookingRef: string) {
    const booking = await this.bookingRepository.findOne({
      where: { bookingRef },
      relations: ['seats'],
    });

    if (!booking) {
      throwError('NOT_FOUND', 'Booking not found');
    }

    const timing = mapReservationTiming(booking);

    return {
      id: booking.id,
      bookingRef: booking.bookingRef,
      showId: booking.showId,
      email: booking.email,
      status: booking.status,
      totalAmountCents: booking.totalAmountCents,
      currency: booking.currency,
      holdExpiresAt: timing.holdExpiresAt,
      paymentExpiresAt: timing.paymentExpiresAt,
      activeExpiresAt: timing.activeExpiresAt,
      remainingSeconds: timing.remainingSeconds,
      createdAt: booking.createdAt?.toISOString() || null,
      updatedAt: booking.updatedAt?.toISOString() || null,
      seats: booking.seats.map((bs) => ({
        seatId: bs.seatId,
        seatType: bs.seatType,
        priceCents: bs.priceCents,
      })),
    };
  }
}
