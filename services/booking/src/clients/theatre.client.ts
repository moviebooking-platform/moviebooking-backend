import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BookingServiceClient } from './booking-service-client.base';

/** Raw screen shape from Theatre Service `GET /api/internal/screens/:id`. */
export interface ScreenDto {
  id: number;
  theatreId: number;
  name: string;
  status: string;
}

/** Raw seat shape from `GET /api/internal/screens/:screenId/seats`. */
export interface SeatDto {
  id: number;
  screenId: number;
  seatCode: string;
  rowLabel: string;
  seatNumber: number;
  seatType: string;
  status: string;
}

/** Calls the Theatre Service internal APIs. Returns null when a resource is missing; throws if the service is down. */
@Injectable()
export class TheatreClient extends BookingServiceClient {
  constructor(httpService: HttpService) {
    super(httpService, 'TheatreClient');
  }

  /** Fetches a screen by ID. Returns null if the screen does not exist. */
  getScreen(screenId: number): Promise<ScreenDto | null> {
    return this.getOrNull<ScreenDto>(`/api/internal/screens/${screenId}`);
  }

  /** Fetches the active seats of a screen. Returns null if the screen does not exist. */
  getScreenSeats(screenId: number): Promise<SeatDto[] | null> {
    return this.getOrNull<SeatDto[]>(`/api/internal/screens/${screenId}/seats`);
  }

  /** Resolves the screen IDs belonging to a theatre, for admin scoping. Empty until the theatre-screens endpoint exists. */
  async getScreensByTheatre(theatreId: number): Promise<number[]> {
    const result = await this.getOrNull<number[]>(
      `/api/internal/theatres/${theatreId}/screens`,
    );
    return result ?? [];
  }
}
