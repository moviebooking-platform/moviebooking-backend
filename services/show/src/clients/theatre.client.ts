import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseServiceClient } from '@moviebooking/common';

export interface ScreenDto {
  id: number;
  theatreId: number;
  name: string;
  status: string;
}

export interface TheatreDto {
  id: number;
  name: string;
  city: string;
  address: string;
  status: string;
}

export interface SeatDto {
  id: number;
  screenId: number;
  seatCode: string;
  rowLabel: string;
  seatNumber: number;
  seatType: string;
  status: string;
}

/** Client for the Theatre Service internal APIs. */
@Injectable()
export class TheatreClient extends BaseServiceClient {
  constructor(httpService: HttpService) {
    super(httpService, 'TheatreClient');
  }

  /** Fetches a screen by ID. Returns null if not found or service unavailable. */
  async getScreen(screenId: number): Promise<ScreenDto | null> {
    return this.get<ScreenDto>(`/api/internal/screens/${screenId}`);
  }

  /** Fetches multiple screens in a single call. Returns empty array on failure. */
  async getScreensByIds(screenIds: number[]): Promise<ScreenDto[]> {
    if (!screenIds.length) return [];
    const result = await this.post<ScreenDto[]>('/api/internal/screens/batch', { screenIds });
    return result ?? [];
  }

  /** Fetches all active seats for a screen. */
  async getScreenSeats(screenId: number): Promise<SeatDto[]> {
    const result = await this.get<SeatDto[]>(`/api/internal/screens/${screenId}/seats`);
    return result ?? [];
  }

  /** Fetches a theatre by ID. Returns null if not found or service unavailable. */
  async getTheatre(theatreId: number): Promise<TheatreDto | null> {
    return this.get<TheatreDto>(`/api/internal/theatres/${theatreId}`);
  }

  /** Fetches multiple theatres in a single call. Returns empty array on failure. */
  async getTheatresByIds(theatreIds: number[]): Promise<TheatreDto[]> {
    if (!theatreIds.length) return [];
    const result = await this.post<TheatreDto[]>('/api/internal/theatres/batch', { theatreIds });
    return result ?? [];
  }

  /** Verifies a screen belongs to a theatre. */
  async verifyScreenOwnership(screenId: number, theatreId: number): Promise<boolean> {
    const screen = await this.getScreen(screenId);
    return screen?.theatreId === theatreId;
  }
}
