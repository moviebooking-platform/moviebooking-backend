import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screen, ScreenStatus, Theatre, Seat } from '../../entities';
import {
  throwError,
  PaginatedResponse,
  encryptId,
  ICurrentUser,
} from '@moviebooking/common';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { ListScreensQueryDto } from './dto/list-screens-query.dto';

@Injectable()
export class ScreensService {
  constructor(
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
    @InjectRepository(Theatre)
    private readonly theatreRepository: Repository<Theatre>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
  ) {}

  async create(theatreId: number, dto: CreateScreenDto) {
    // Verify theatre exists
    const theatre = await this.theatreRepository.findOne({
      where: { id: theatreId },
    });

    if (!theatre) {
      throwError('NOT_FOUND', 'Theatre not found');
    }

    const screen = this.screenRepository.create({
      ...dto,
      theatreId,
      status: ScreenStatus.ACTIVE,
    });

    const saved = await this.screenRepository.save(screen);
    return this.mapResponse(saved);
  }

  async findAll(theatreId: number, query: ListScreensQueryDto, user?: ICurrentUser) {
    const { page = 1, pageSize = 20 } = query;

    // Verify theatre exists
    const theatre = await this.theatreRepository.findOne({
      where: { id: theatreId },
    });

    if (!theatre) {
      throwError('NOT_FOUND', 'Theatre not found');
    }

    const qb = this.screenRepository.createQueryBuilder('screen')
      .where('screen.theatreId = :theatreId', { theatreId });

    // Guest (unauthenticated): ACTIVE only
    // Authenticated users: all statuses
    if (!user) {
      qb.andWhere('screen.status = :status', { status: ScreenStatus.ACTIVE });
    }

    qb.orderBy('screen.name', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [screens, total] = await qb.getManyAndCount();

    // Get seat counts for each screen
    const screensWithCounts = await Promise.all(
      screens.map(async (screen) => {
        const seatCount = await this.seatRepository.count({
          where: { screenId: screen.id },
        });
        return { ...this.mapResponse(screen), seatCount };
      }),
    );

    return new PaginatedResponse(screensWithCounts, total, page, pageSize);
  }


  async findOne(theatreId: number, screenId: number, user?: ICurrentUser) {
    const whereCondition: any = { id: screenId, theatreId };

    // Guest (unauthenticated): ACTIVE only
    if (!user) {
      whereCondition.status = ScreenStatus.ACTIVE;
    }

    const screen = await this.screenRepository.findOne({ where: whereCondition });

    if (!screen) {
      throwError('NOT_FOUND', 'Screen not found');
    }

    const seatCount = await this.seatRepository.count({
      where: { screenId: screen.id },
    });

    return { ...this.mapResponse(screen), seatCount };
  }

  async update(theatreId: number, screenId: number, dto: UpdateScreenDto) {
    const screen = await this.screenRepository.findOne({
      where: { id: screenId, theatreId },
    });

    if (!screen) {
      throwError('NOT_FOUND', 'Screen not found');
    }

    Object.assign(screen, dto);
    const updated = await this.screenRepository.save(screen);
    return this.mapResponse(updated);
  }

  async remove(theatreId: number, screenId: number) {
    const screen = await this.screenRepository.findOne({
      where: { id: screenId, theatreId },
    });

    if (!screen) {
      throwError('NOT_FOUND', 'Screen not found');
    }

    // TODO: Check for future shows once Show Service is built
    screen.status = ScreenStatus.INACTIVE;
    await this.screenRepository.save(screen);

    return this.mapResponse(screen);
  }

  private mapResponse(screen: Screen) {
    return {
      id: encryptId(screen.id),
      theatreId: encryptId(screen.theatreId),
      name: screen.name,
      status: screen.status,
      createdAt: screen.createdAt,
      updatedAt: screen.updatedAt,
    };
  }
}
