import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseServiceClient } from '@moviebooking/common';

export interface ScreenDto {
  id: number;
  theatreId: number;
  name: string;
  totalSeats: number;
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

/**
 * Client for communicating with Theatre Service.
 * Provides methods to fetch screen and seat data for show scheduling and availability.
 */
@Injectable()
export class TheatreClient extends BaseServiceClient {
  constructor(httpService: HttpService) {
    super(httpService, 'TheatreClient');
  }

  /**
   * Fetches screen details by ID from Theatre Service.
   * Returns null if screen not found.
   */
  async getScreen(screenId: number): Promise<ScreenDto | null> {
    try {
      return await this.get<ScreenDto>(`/api/internal/screens/${screenId}`);
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetches all seats for a screen from Theatre Service.
   * Used for seat availability calculations.
   */
  async getScreenSeats(screenId: number): Promise<SeatDto[]> {
    return this.get<SeatDto[]>(`/api/internal/screens/${screenId}/seats`);
  }

  /**
   * Verifies that a screen belongs to a specific theatre.
   * Returns true if screen belongs to theatre, false otherwise.
   */
  async verifyScreenOwnership(
    screenId: number,
    theatreId: number,
  ): Promise<boolean> {
    const screen = await this.getScreen(screenId);
    if (!screen) {
      return false;
    }
    return screen.theatreId === theatreId;
  }
}
