import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TheatreAdmin, TheatreAdminStatus, Screen } from '../../entities';

@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(TheatreAdmin)
    private readonly theatreAdminRepository: Repository<TheatreAdmin>,
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>
  ) {}

  async getTheatreIdByUserId(userId: number): Promise<{ theatreId: number | null }> {
    const assignment = await this.theatreAdminRepository.findOne({
      where: { userId, status: TheatreAdminStatus.ACTIVE },
    });

    return { theatreId: assignment?.theatreId ?? null };
  }

  async getScreenById(id: number) {
    const screen = await this.screenRepository.findOneBy({ id });

    if (!screen) {
      return null;
    }

    return {
      id: screen.id,
      theatreId: screen.theatreId,
      name: screen.name,
      status: screen.status,
    };
  }
}
