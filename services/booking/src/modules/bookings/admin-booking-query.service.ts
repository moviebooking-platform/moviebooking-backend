import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking } from '@moviebooking/database';
import {
  decryptId,
  encryptId,
  formatUtcDateTime,
  ICurrentUser,
  PaginatedResponse,
  ROLES,
  throwError,
} from '@moviebooking/common';
import { Repository } from 'typeorm';
import { ShowClient } from '../../clients/show.client';
import { TheatreClient } from '../../clients/theatre.client';
import { TheatreBookingScopeService } from './theatre-booking-scope.service';
import { AdminBookingDetailResponseDto } from './dto/admin-booking-detail-response.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { AdminBookingSummaryResponseDto } from './dto/admin-booking-summary-response.dto';
import { mapReservationTiming } from './reservation-timing.mapper';

@Injectable()
export class AdminBookingQueryService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly theatreBookingScopeService: TheatreBookingScopeService,
    private readonly showClient: ShowClient,
    private readonly theatreClient: TheatreClient,
  ) {}

  async listBookings(
    query: ListBookingsQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedResponse<AdminBookingSummaryResponseDto>> {
    const { page = 1, pageSize = 20 } = query;
    const accessibleShowIds = await this.resolveAccessibleShowIds(currentUser);

    if (accessibleShowIds?.length === 0) {
      return new PaginatedResponse([], 0, page, pageSize);
    }

    const requestedShowId = this.decryptShowId(query.showId);

    if (
      requestedShowId &&
      accessibleShowIds &&
      !accessibleShowIds.includes(requestedShowId)
    ) {
      return new PaginatedResponse([], 0, page, pageSize);
    }

    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .select([
        'booking.id',
        'booking.bookingRef',
        'booking.showId',
        'booking.email',
        'booking.status',
        'booking.totalAmountCents',
        'booking.currency',
        'booking.holdExpiresAt',
        'booking.paymentExpiresAt',
        'booking.createdAt',
      ]);

    if (accessibleShowIds) {
      if (requestedShowId) {
        qb.andWhere('booking.showId = :showId', {
          showId: requestedShowId,
        });
      } else {
        qb.andWhere('booking.showId IN (:...accessibleShowIds)', {
          accessibleShowIds,
        });
      }
    } else if (requestedShowId) {
      qb.andWhere('booking.showId = :showId', { showId: requestedShowId });
    }

    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    if (query.bookingDate) {
      const start = new Date(`${query.bookingDate}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      qb.andWhere('booking.createdAt >= :start', { start }).andWhere(
        'booking.createdAt < :end',
        { end },
      );
    }

    qb.orderBy('booking.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [bookings, total] = await qb.getManyAndCount();

    // One timestamp for the whole page so countdowns stay consistent across rows
    const responseNow = new Date();

    return new PaginatedResponse(
      bookings.map((booking) => this.mapSummary(booking, responseNow)),
      total,
      page,
      pageSize,
    );
  }

  async getBookingDetail(
    encryptedBookingId: string,
    currentUser: ICurrentUser,
  ): Promise<AdminBookingDetailResponseDto> {
    const bookingId = this.decryptBookingId(encryptedBookingId);
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['seats', 'holds'],
    });

    if (!booking) {
      throwError('NOT_FOUND', 'Booking not found');
    }

    if (currentUser.role.code === ROLES.THEATRE_ADMIN) {
      if (!currentUser.theatreId) {
        throwError('FORBIDDEN');
      }
    } else if (currentUser.role.code !== ROLES.SUPER_ADMIN) {
      throwError('FORBIDDEN');
    }

    const show = await this.showClient.getShow(booking.showId);
    if (!show) {
      throwError('NOT_FOUND', 'Show not found');
    }

    const screen = await this.theatreClient.getScreen(show.screenId);
    if (!screen) {
      throwError('NOT_FOUND', 'Screen not found');
    }

    if (
      currentUser.role.code === ROLES.THEATRE_ADMIN &&
      screen.theatreId !== currentUser.theatreId
    ) {
      throwError('FORBIDDEN');
    }

    const screenSeats = await this.theatreClient.getScreenSeats(screen.id);
    if (screenSeats === null) {
      throwError('NOT_FOUND', 'Screen not found');
    }
    if (booking.seats.length > 0 && screenSeats.length === 0) {
      throwError('SERVICE_UNAVAILABLE', 'Unable to retrieve seat information');
    }

    const seatById = new Map(screenSeats.map((seat) => [seat.id, seat]));
    const seats = booking.seats.map((bookingSeat) => {
      const seat = seatById.get(bookingSeat.seatId);
      if (!seat) {
        throwError(
          'SERVICE_UNAVAILABLE',
          'Required seat metadata is unavailable',
        );
      }

      return {
        seatId: encryptId(bookingSeat.seatId),
        seatCode: seat.seatCode,
        seatType: bookingSeat.seatType,
        priceCents: bookingSeat.priceCents,
      };
    });

    return {
      id: encryptId(booking.id),
      bookingRef: booking.bookingRef,
      showId: encryptId(booking.showId),
      email: booking.email,
      status: booking.status,
      seats,
      totalAmountCents: booking.totalAmountCents,
      currency: booking.currency,
      needsReviewReason: booking.needsReviewReason,
      createdAt: formatUtcDateTime(booking.createdAt),
      updatedAt: formatUtcDateTime(booking.updatedAt),
      ...mapReservationTiming(booking),
    };
  }

  private async resolveAccessibleShowIds(
    currentUser: ICurrentUser,
  ): Promise<number[] | undefined> {
    if (currentUser.role.code === ROLES.SUPER_ADMIN) {
      return undefined;
    }
    if (currentUser.role.code === ROLES.THEATRE_ADMIN) {
      return this.theatreBookingScopeService.getAccessibleShowIds(
        currentUser.theatreId ?? null,
      );
    }
    throwError('FORBIDDEN');
  }

  private decryptBookingId(encryptedBookingId: string): number {
    const bookingId = decryptId(encryptedBookingId);
    if (bookingId === null || !Number.isInteger(bookingId) || bookingId <= 0) {
      throwError('VALIDATION_ERROR', 'Invalid booking ID');
    }
    return bookingId;
  }

  private decryptShowId(showId?: string): number | undefined {
    if (!showId) {
      return undefined;
    }
    const decryptedShowId = decryptId(showId);
    if (
      decryptedShowId === null ||
      !Number.isInteger(decryptedShowId) ||
      decryptedShowId <= 0
    ) {
      throwError('VALIDATION_ERROR', 'Invalid show ID');
    }
    return decryptedShowId;
  }

  private mapSummary(
    booking: Booking,
    now: Date,
  ): AdminBookingSummaryResponseDto {
    return {
      id: encryptId(booking.id),
      bookingRef: booking.bookingRef,
      showId: encryptId(booking.showId),
      email: booking.email,
      status: booking.status,
      totalAmountCents: booking.totalAmountCents,
      currency: booking.currency,
      createdAt: formatUtcDateTime(booking.createdAt),
      ...mapReservationTiming(booking, now),
    };
  }
}
