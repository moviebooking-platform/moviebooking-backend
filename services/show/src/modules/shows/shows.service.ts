import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Show, ShowStatus } from '../../entities';
import { throwError, ICurrentUser, encryptId, formatUtcDateTime, ROLES } from '@moviebooking/common';
import { CreateShowDto } from './dto/create-show.dto';
import { UpdateShowDto } from './dto/update-show.dto';
import { ListShowsQueryDto } from './dto/list-shows-query.dto';
import { TheatreClient } from '../../clients/theatre.client';
import { MovieClient } from '../../clients/movie.client';

@Injectable()
export class ShowsService {
  private readonly logger = new Logger(ShowsService.name);

  constructor(
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
    private readonly theatreClient: TheatreClient,
    private readonly movieClient: MovieClient,
  ) {}

  async create(dto: CreateShowDto, user: ICurrentUser) {
    // Validate screen ownership for Theatre Admin
    if (user.role.code === ROLES.THEATRE_ADMIN) {
      await this.verifyScreenOwnership(dto.screenId, user.theatreId);
    }

    // Validate movie is active
    await this.verifyMovieActive(dto.movieId);

    // Validate time: startsAt in future, endsAt after startsAt
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    const now = new Date();

    if (startsAt <= now) {
      throwError('VALIDATION_ERROR', 'Show start time must be in the future');
    }

    if (endsAt <= startsAt) {
      throwError('VALIDATION_ERROR', 'Show end time must be after start time');
    }

    // Check for overlapping shows
    await this.checkOverlap(dto.screenId, startsAt, endsAt);

    const show = this.showRepository.create({
      screenId: dto.screenId,
      movieId: dto.movieId,
      startsAt,
      endsAt,
      status: ShowStatus.ACTIVE,
    });

    const saved = await this.showRepository.save(show);
    this.logger.log(`Show created: ${saved.id} for screen ${saved.screenId}`);
    return this.mapResponse(saved);
  }

  async findAll(query: ListShowsQueryDto, user?: ICurrentUser) {
    const { page = 1, pageSize = 20, movieId, theatreId, screenId, date, fromDate, toDate, status } = query;

    const qb = this.showRepository.createQueryBuilder('show');

    // Guest: ACTIVE only; authenticated: all or filtered by status
    if (!user) {
      qb.where('show.status = :status', { status: ShowStatus.ACTIVE });
    } else if (status) {
      qb.where('show.status = :status', { status });
    }

    if (movieId) {
      qb.andWhere('show.movieId = :movieId', { movieId });
    }

    if (screenId) {
      qb.andWhere('show.screenId = :screenId', { screenId });
    }

    // Theatre filter requires fetching screens from Theatre Service
    if (theatreId) {
      const screen = await this.theatreClient.getScreen(screenId);
      if (screen && screen.theatreId === theatreId) {
        qb.andWhere('show.screenId = :screenId', { screenId });
      } else {
        // No matching screens, return empty
        return { data: [], total: 0, page, pageSize };
      }
    }

    // Date filters
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      qb.andWhere('show.startsAt >= :startOfDay', { startOfDay });
      qb.andWhere('show.startsAt <= :endOfDay', { endOfDay });
    }

    if (fromDate) {
      const from = new Date(fromDate);
      from.setUTCHours(0, 0, 0, 0);
      qb.andWhere('show.startsAt >= :from', { from });
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setUTCHours(23, 59, 59, 999);
      qb.andWhere('show.startsAt <= :to', { to });
    }

    qb.orderBy('show.startsAt', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [shows, total] = await qb.getManyAndCount();

    return {
      data: shows.map(s => this.mapResponse(s)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number, user?: ICurrentUser) {
    const show = await this.showRepository.findOne({ where: { id } });

    if (!show) {
      throwError('NOT_FOUND', 'Show not found');
    }

    // Guest: only ACTIVE
    if (!user && show.status !== ShowStatus.ACTIVE) {
      throwError('NOT_FOUND', 'Show not found');
    }

    return this.mapResponse(show);
  }

  async update(id: number, dto: UpdateShowDto, user: ICurrentUser) {
    const show = await this.showRepository.findOne({ where: { id } });

    if (!show) {
      throwError('NOT_FOUND', 'Show not found');
    }

    // Validate screen ownership for Theatre Admin
    if (user.role.code === ROLES.THEATRE_ADMIN) {
      await this.verifyScreenOwnership(show.screenId, user.theatreId);
    }

    // Check if show has bookings (placeholder - will integrate with Booking Service in M6)
    const hasBookings = false; // TODO: Check with Booking Service

    // If changing times and show has bookings, reject
    if (hasBookings && (dto.startsAt || dto.endsAt)) {
      throwError('BUSINESS_RULE_VIOLATION', 'Cannot update show times when bookings exist');
    }

    // If changing times, validate and check overlap
    if (dto.startsAt || dto.endsAt) {
      const newStartsAt = dto.startsAt ? new Date(dto.startsAt) : show.startsAt;
      const newEndsAt = dto.endsAt ? new Date(dto.endsAt) : show.endsAt;

      if (newEndsAt <= newStartsAt) {
        throwError('VALIDATION_ERROR', 'Show end time must be after start time');
      }

      await this.checkOverlap(show.screenId, newStartsAt, newEndsAt, id);
    }

    // Apply updates
    if (dto.startsAt) show.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) show.endsAt = new Date(dto.endsAt);
    if (dto.status) show.status = dto.status;

    const updated = await this.showRepository.save(show);
    this.logger.log(`Show updated: ${updated.id}`);
    return this.mapResponse(updated);
  }

  async delete(id: number, user: ICurrentUser) {
    const show = await this.showRepository.findOne({ where: { id } });

    if (!show) {
      throwError('NOT_FOUND', 'Show not found');
    }

    // Validate screen ownership for Theatre Admin
    if (user.role.code === ROLES.THEATRE_ADMIN) {
      await this.verifyScreenOwnership(show.screenId, user.theatreId);
    }

    // Check if show has bookings (placeholder - will integrate with Booking Service in M6)
    const hasBookings = false; // TODO: Check with Booking Service

    if (hasBookings) {
      throwError('BUSINESS_RULE_VIOLATION', 'Cannot delete show with existing bookings');
    }

    await this.showRepository.softDelete(id);
    this.logger.log(`Show deleted: ${id}`);
    return { success: true };
  }

  // Private Helper Methods

  /** Checks if two time intervals overlap using interval intersection formula. */
  private async checkOverlap(
    screenId: number,
    startsAt: Date,
    endsAt: Date,
    excludeShowId?: number,
  ): Promise<void> {
    const qb = this.showRepository
      .createQueryBuilder('show')
      .where('show.screenId = :screenId', { screenId })
      .andWhere('show.status = :status', { status: ShowStatus.ACTIVE })
      .andWhere('show.startsAt < :endsAt', { endsAt })
      .andWhere('show.endsAt > :startsAt', { startsAt });

    if (excludeShowId) {
      qb.andWhere('show.id != :excludeShowId', { excludeShowId });
    }

    const conflictingShow = await qb.getOne();

    if (conflictingShow) {
      throwError('DUPLICATE_RESOURCE', `Show overlaps with existing show (${encryptId(conflictingShow.id)})`);
    }
  }

  /** Verifies that the screen belongs to the theatre. */
  private async verifyScreenOwnership(screenId: number, theatreId: number): Promise<void> {
    try {
      const screen = await this.theatreClient.getScreen(screenId);
      
      if (!screen) {
        throwError('NOT_FOUND', 'Screen not found');
      }

      if (screen.theatreId !== theatreId) {
        throwError('FORBIDDEN', 'You can only create shows for your assigned theatre');
      }
    } catch (error) {
      if (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN') {
        throw error;
      }
      this.logger.error(`Theatre Service unavailable: ${error.message}`);
      throwError('SERVICE_UNAVAILABLE', 'Theatre Service is currently unavailable');
    }
  }

  /** Verifies that the movie exists and is active. */
  private async verifyMovieActive(movieId: number): Promise<void> {
    try {
      const isActive = await this.movieClient.isMovieActive(movieId);
      
      if (!isActive) {
        throwError('VALIDATION_ERROR', 'Movie not found or not active');
      }
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') {
        throw error;
      }
      this.logger.error(`Movie Service unavailable: ${error.message}`);
      throwError('SERVICE_UNAVAILABLE', 'Movie Service is currently unavailable');
    }
  }

  /** Maps Show entity to response DTO with encrypted IDs. */
  private mapResponse(show: Show) {
    return {
      id: encryptId(show.id),
      movieId: encryptId(show.movieId),
      screenId: encryptId(show.screenId),
      startsAt: formatUtcDateTime(show.startsAt),
      endsAt: formatUtcDateTime(show.endsAt),
      status: show.status,
      createdAt: formatUtcDateTime(show.createdAt),
      updatedAt: formatUtcDateTime(show.updatedAt),
    };
  }
}
