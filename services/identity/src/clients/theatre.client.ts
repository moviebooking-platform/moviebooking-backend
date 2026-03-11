import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseServiceClient } from '@moviebooking/common';

interface TheatreAdminResponse {
  theatreId: number | null;
}

@Injectable()
export class TheatreClient extends BaseServiceClient {
  constructor(httpService: HttpService) {
    super(httpService, 'TheatreClient');
  }

  /**
   * Get the assigned theatreId for a user from Theatre Service.
   * Returns null if user has no assignment or Theatre Service is unavailable.
   */
  async getTheatreIdByUserId(userId: number): Promise<number | null> {
    const result = await this.get<TheatreAdminResponse>(
      `/api/internal/theatre-admins/by-user/${userId}`,
    );
    return result?.theatreId ?? null;
  }
}
