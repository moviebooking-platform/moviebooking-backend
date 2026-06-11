import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Theatre,
  TheatreAdmin,
  TheatreAdminStatus,
  Screen,
  Seat,
  SeatStatus,
} from '../../entities';

@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(Theatre)
    private readonly theatreRepository: Repository<Theatre>,
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

  /** Fetches a theatre by ID. Returns null if not found. */
  async getTheatreById(id: number) {
    const theatre = await this.theatreRepository.findOneBy({ id });
    if (!theatre) return null;
    return this.mapTheatre(theatre);
  }

  /** Fetches multiple theatres in a single query for batch enrichment. */
  async getTheatresByIds(ids: number[]) {
    if (!ids.length) return [];
    const theatres = await this.theatreRepository.find({ where: { id: In(ids) } });
    return theatres.map((t) => this.mapTheatre(t));
  }

  /** Fetches a screen by ID. Returns null if not found. */
  async getScreenById(id: number) {
    const screen = await this.screenRepository.findOneBy({ id });
    if (!screen) return null;
    return this.mapScreen(screen);
  }

  /** Fetches multiple screens in a single query for batch enrichment. */
  async getScreensByIds(ids: number[]) {
    if (!ids.length) return [];
    const screens = await this.screenRepository.find({ where: { id: In(ids) } });
    return screens.map((s) => this.mapScreen(s));
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

  private mapTheatre(theatre: Theatre) {
    return {
      id: theatre.id,
      name: theatre.name,
      city: theatre.city,
      address: theatre.address,
      status: theatre.status,
    };
  }

  private mapScreen(screen: Screen) {
    return {
      id: screen.id,
      theatreId: screen.theatreId,
      name: screen.name,
      status: screen.status,
    };
  }
}
