import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseServiceClient } from '@moviebooking/common';

export interface IdentityUserResponse {
  id: number;
  name: string;
  email: string;
  role: { id: number; code: string; name: string };
}

@Injectable()
export class IdentityClient extends BaseServiceClient {
  constructor(httpService: HttpService) {
    super(httpService, 'IdentityClient');
  }

  async getUserById(userId: number): Promise<IdentityUserResponse | null> {
    return this.get<IdentityUserResponse>(`/api/internal/users/${userId}`);
  }

  async getUsersByIds(userIds: number[]): Promise<IdentityUserResponse[]> {
    if (!userIds.length) return [];
    const result = await this.post<IdentityUserResponse[]>(
      '/api/internal/users/batch',
      { userIds },
    );
    return result ?? [];
  }
}
