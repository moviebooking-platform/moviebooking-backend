import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theatre, TheatreStatus, Screen } from '../../entities';
import {
  throwError,
  PaginatedResponse,
  encryptId,
  ICurrentUser,
} from '@moviebooking/common';
import { CreateTheatreDto } from './dto/create-theatre.dto';
import { UpdateTheatreDto } from './dto/update-theatre.dto';
import { ListTheatresQueryDto } from './dto/list-theatres-query.dto';

@Injectable()
export class TheatresService {
  constructor(
    @InjectRepository(Theatre)
    private readonly theatreRepository: Repository<Theatre>,
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
  ) {}

  async create(dto: CreateTheatreDto) {
    const theatre = this.theatreRepository.create({
      ...dto,
      status: TheatreStatus.ACTIVE,
    });

    const saved = await this.theatreRepository.save(theatre);
    return this.mapResponse(saved);
  }

  async findAll(query: ListTheatresQueryDto, user?: ICurrentUser) {    
    const { page = 1, pageSize = 20, city } = query;

    const qb = this.theatreRepository.createQueryBuilder('theatre');

    // Guest (unauthenticated): ACTIVE only
    // Authenticated users: all statuses
    if (!user) {
      qb.where('theatre.status = :status', { status: TheatreStatus.ACTIVE });
    }

    if (city) {
      qb.andWhere('theatre.city = :city', { city });
    }

    qb.orderBy('theatre.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [theatres, total] = await qb.getManyAndCount();

    return new PaginatedResponse(
      theatres.map((t) => this.mapResponse(t)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: number, user?: ICurrentUser) {
    const whereCondition: any = { id };
    
    // Guest (unauthenticated): ACTIVE only
    // Authenticated users: all statuses
    if (!user) {
      whereCondition.status = TheatreStatus.ACTIVE;
    }

    const theatre = await this.theatreRepository.findOne({ where: whereCondition });

    if (!theatre) {
      throwError('NOT_FOUND', 'Theatre not found');
    }

    const screenCount = await this.screenRepository.count({
      where: { theatreId: id },
    });

    return { ...this.mapResponse(theatre), screenCount };
  }

  async update(id: number, dto: UpdateTheatreDto) {
    const theatre = await this.theatreRepository.findOne({ where: { id } });

    if (!theatre) {
      throwError('NOT_FOUND', 'Theatre not found');
    }

    Object.assign(theatre, dto);
    const updated = await this.theatreRepository.save(theatre);
    return this.mapResponse(updated);
  }

  async remove(id: number) {
    const theatre = await this.theatreRepository.findOne({ where: { id } });

    if (!theatre) {
      throwError('NOT_FOUND', 'Theatre not found');
    }

    // TODO: Check for future shows once Show Service is built
    theatre.status = TheatreStatus.INACTIVE;
    await this.theatreRepository.save(theatre);

    return this.mapResponse(theatre);
  }

  private mapResponse(theatre: Theatre) {
    return {
      id: encryptId(theatre.id),
      name: theatre.name,
      city: theatre.city,
      address: theatre.address,
      status: theatre.status,
      createdAt: theatre.createdAt,
      updatedAt: theatre.updatedAt,
    };
  }
}
