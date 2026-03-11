import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TheatreAdmin, TheatreAdminStatus } from '../../entities';

@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(TheatreAdmin)
    private readonly theatreAdminRepository: Repository<TheatreAdmin>,
  ) {}

  async getTheatreIdByUserId(userId: number): Promise<{ theatreId: number | null }> {
    const assignment = await this.theatreAdminRepository.findOne({
      where: { userId, status: TheatreAdminStatus.ACTIVE },
    });

    return { theatreId: assignment?.theatreId ?? null };
  }
}
