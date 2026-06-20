import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BookingServiceClient } from './booking-service-client.base';

/** Raw show shape returned by Show Service `GET /api/internal/shows/:id`. */
export interface ShowDto {
  id: number;
  screenId: number;
  movieId: number;
  startsAt: string;
  endsAt: string;
  status: string;
}

/** Per-seat-type price for a show. `amount` is in minor units, snapshotted into booking_seats.price_cents at hold time. */
export interface PriceDto {
  id: number;
  showId: number;
  seatType: string;
  amount: number;
  currency: string;
}

/** Calls the Show Service internal APIs. Returns null when a show is missing; throws if the service is down. */
@Injectable()
export class ShowClient extends BookingServiceClient {
  constructor(httpService: HttpService) {
    super(httpService, 'ShowClient');
  }

  /** Fetches a show by ID. Returns null if the show does not exist. */
  getShow(showId: number): Promise<ShowDto | null> {
    return this.getOrNull<ShowDto>(`/api/internal/shows/${showId}`);
  }

  /** Fetches per-seat-type prices for a show. Returns null if the show does not exist. */
  getPrices(showId: number): Promise<PriceDto[] | null> {
    return this.getOrNull<PriceDto[]>(`/api/internal/shows/${showId}/prices`);
  }

  /** Resolves the show IDs running on the given screens, for admin theatre scoping. Empty until the by-screens endpoint exists. */
  async getShowIdsByScreens(screenIds: number[]): Promise<number[]> {
    if (!screenIds.length) return [];
    const result = await this.getOrNull<number[]>(
      `/api/internal/shows/by-screens?screenIds=${screenIds.join(',')}`,
    );
    return result ?? [];
  }
}
