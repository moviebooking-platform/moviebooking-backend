import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TheatreAdmin, TheatreAdminStatus, Screen, Seat, SeatStatus } from '../../entities';

@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(TheatreAdmin)
    private readonly theatreAdminRepository: Repository<TheatreAdmin>,
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
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

  async getSeatsByScreenId(screenId: number) {
    const seats = await this.seatRepository.find({
      where: { screenId, status: SeatStatus.ACTIVE },
      order: { rowLabel: 'ASC', seatNumber: 'ASC' },
    });

    return seats.map((seat) => ({
      id: seat.id,
      screenId: seat.screenId,
      seatCode: seat.seatCode,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      seatType: seat.seatType,
      status: seat.status,
    }));
  }
}
