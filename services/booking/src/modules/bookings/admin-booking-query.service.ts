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
import { TheatreBookingScopeService } from './theatre-booking-scope.service';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { AdminBookingSummaryResponseDto } from './dto/admin-booking-summary-response.dto';

@Injectable()
export class AdminBookingQueryService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly theatreBookingScopeService: TheatreBookingScopeService,
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

    return new PaginatedResponse(
      bookings.map((booking) => this.mapSummary(booking)),
      total,
      page,
      pageSize,
    );
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

  private mapSummary(booking: Booking): AdminBookingSummaryResponseDto {
    return {
      bookingRef: booking.bookingRef,
      showId: encryptId(booking.showId),
      email: booking.email,
      status: booking.status,
      totalAmountCents: booking.totalAmountCents,
      currency: booking.currency,
      holdExpiresAt: formatUtcDateTime(booking.holdExpiresAt),
      createdAt: formatUtcDateTime(booking.createdAt),
    };
  }
}
