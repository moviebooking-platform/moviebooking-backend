import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Show, ShowPrice, ShowStatus } from '../../entities';
import {
  throwError,
  ICurrentUser,
  encryptId,
  decryptId,
  formatUtcDateTime,
  PaginatedResponse,
  ROLES,
} from '@moviebooking/common';
import { CreateShowDto } from './dto/create-show.dto';
import { UpdateShowDto } from './dto/update-show.dto';
import { ListShowsQueryDto } from './dto/list-shows-query.dto';
import { TheatreClient, ScreenDto, TheatreDto } from '../../clients/theatre.client';
import { MovieClient, MovieDto } from '../../clients/movie.client';

@Injectable()
export class ShowsService {
  private readonly logger = new Logger(ShowsService.name);

  constructor(
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
    @InjectRepository(ShowPrice)
    private readonly showPriceRepository: Repository<ShowPrice>,
    private readonly theatreClient: TheatreClient,
    private readonly movieClient: MovieClient,
  ) {}

  async create(dto: CreateShowDto, user: ICurrentUser) {
    const movieId = decryptId(dto.movieId);
    const screenId = decryptId(dto.screenId);

    if (!movieId || !screenId) {
      throwError('VALIDATION_ERROR', 'Invalid movieId or screenId');
    }

    if (user.role.code === ROLES.THEATRE_ADMIN) {
      await this.verifyScreenOwnership(screenId, user.theatreId);
    }

    await this.verifyMovieActive(movieId);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    const now = new Date();

    if (startsAt <= now) {
      throwError('VALIDATION_ERROR', 'Show start time must be in the future');
    }

    if (endsAt <= startsAt) {
      throwError('VALIDATION_ERROR', 'Show end time must be after start time');
    }

    await this.checkOverlap(screenId, startsAt, endsAt);

    const show = this.showRepository.create({
      screenId,
      movieId,
      startsAt,
      endsAt,
      status: ShowStatus.ACTIVE,
    });

    const saved = await this.showRepository.save(show);
    this.logger.log(`Show created: ${saved.id} for screen ${saved.screenId}`);
    return this.mapMutationResponse(saved);
  }

  async findAll(query: ListShowsQueryDto, user?: ICurrentUser) {
    const {
      page = 1,
      pageSize = 20,
      movieId,
      theatreId,
      screenId,
      date,
      fromDate,
      toDate,
      status,
    } = query;

    const decryptedMovieId = movieId ? decryptId(movieId) : undefined;
    const decryptedTheatreId = theatreId ? decryptId(theatreId) : undefined;
    const decryptedScreenId = screenId ? decryptId(screenId) : undefined;

    const qb = this.showRepository.createQueryBuilder('show');

    // Guest: ACTIVE only; authenticated: all or filtered by status
    if (!user) {
      qb.where('show.status = :status', { status: ShowStatus.ACTIVE });
    } else if (status) {
      qb.where('show.status = :status', { status });
    }

    if (decryptedMovieId) {
      qb.andWhere('show.movieId = :movieId', { movieId: decryptedMovieId });
    }

    if (decryptedScreenId) {
      qb.andWhere('show.screenId = :screenId', { screenId: decryptedScreenId });
    }

    // Theatre filter: fetch its screens, then filter shows by those screen IDs
    if (decryptedTheatreId && !decryptedScreenId) {
      const allShowsScreens = await this.showRepository
        .createQueryBuilder('s')
        .select('DISTINCT s.screenId', 'screenId')
        .getRawMany<{ screenId: number }>();

      const screenIds = allShowsScreens.map((r) => r.screenId);
      const screens = await this.theatreClient.getScreensByIds(screenIds);
      const matchingScreenIds = screens
        .filter((s) => s.theatreId === decryptedTheatreId)
        .map((s) => s.id);

      if (!matchingScreenIds.length) {
        return new PaginatedResponse([], 0, page, pageSize);
      }

      qb.andWhere('show.screenId IN (:...matchingScreenIds)', { matchingScreenIds });
    }

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

    if (!shows.length) {
      return new PaginatedResponse([], 0, page, pageSize);
    }

    // Batch enrichment - one round trip per service regardless of show count
    const { movieMap, screenMap, theatreMap, pricingMap } =
      await this.fetchListEnrichmentData(shows);

    const enriched = shows.map((show) =>
      this.mapListResponse(
        show,
        movieMap.get(show.movieId) ?? null,
        screenMap.get(show.screenId) ?? null,
        theatreMap.get(screenMap.get(show.screenId)?.theatreId ?? -1) ?? null,
        pricingMap.get(show.id) ?? [],
      ),
    );

    return new PaginatedResponse(enriched, total, page, pageSize);
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

    // Fetch all enrichment data in parallel
    const [movie, screen, prices] = await Promise.all([
      this.movieClient.getMovie(show.movieId),
      this.theatreClient.getScreen(show.screenId),
      this.showPriceRepository.find({ where: { showId: show.id } }),
    ]);

    const theatre = screen ? await this.theatreClient.getTheatre(screen.theatreId) : null;

    return this.mapDetailResponse(show, movie, screen, theatre, prices);
  }

  async update(id: number, dto: UpdateShowDto, user: ICurrentUser) {
    const show = await this.showRepository.findOne({ where: { id } });

    if (!show) {
      throwError('NOT_FOUND', 'Show not found');
    }

    if (user.role.code === ROLES.THEATRE_ADMIN) {
      await this.verifyScreenOwnership(show.screenId, user.theatreId);
    }

    // TODO: Booking integration (M6) - block time changes when bookings exist
    const hasBookings = false;

    if (hasBookings && (dto.startsAt || dto.endsAt)) {
      throwError('BUSINESS_RULE_VIOLATION', 'Cannot update show times when bookings exist');
    }

    if (dto.startsAt || dto.endsAt) {
      const newStartsAt = dto.startsAt ? new Date(dto.startsAt) : show.startsAt;
      const newEndsAt = dto.endsAt ? new Date(dto.endsAt) : show.endsAt;

      if (newEndsAt <= newStartsAt) {
        throwError('VALIDATION_ERROR', 'Show end time must be after start time');
      }

      await this.checkOverlap(show.screenId, newStartsAt, newEndsAt, id);
    }

    if (dto.startsAt) show.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) show.endsAt = new Date(dto.endsAt);
    if (dto.status) show.status = dto.status;

    const updated = await this.showRepository.save(show);
    this.logger.log(`Show updated: ${updated.id}`);
    return this.mapMutationResponse(updated);
  }

  async delete(id: number, user: ICurrentUser) {
    const show = await this.showRepository.findOne({ where: { id } });

    if (!show) {
      throwError('NOT_FOUND', 'Show not found');
    }

    if (user.role.code === ROLES.THEATRE_ADMIN) {
      await this.verifyScreenOwnership(show.screenId, user.theatreId);
    }

    // TODO: Booking integration (M6) - block delete when bookings exist
    const hasBookings = false;

    if (hasBookings) {
      throwError('BUSINESS_RULE_VIOLATION', 'Cannot delete show with existing bookings');
    }

    await this.showRepository.softDelete(id);
    this.logger.log(`Show deleted: ${id}`);
    return { success: true };
  }

  // Private Helper Methods

  /** Checks if two time intervals overlap on the same screen. */
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

    const conflict = await qb.getOne();
    if (conflict) {
      throwError('DUPLICATE_RESOURCE', `Show overlaps with existing show (${encryptId(conflict.id)})`);
    }
  }

  /** Verifies that the screen belongs to the theatre. */
  private async verifyScreenOwnership(screenId: number, theatreId: number): Promise<void> {
    const screen = await this.theatreClient.getScreen(screenId);

    if (!screen) {
      throwError('NOT_FOUND', 'Screen not found');
    }

    if (screen.theatreId !== theatreId) {
      throwError('FORBIDDEN', 'You can only manage shows for your assigned theatre');
    }
  }

  /** Verifies the movie exists and is active. */
  private async verifyMovieActive(movieId: number): Promise<void> {
    const movie = await this.movieClient.getMovie(movieId);

    if (!movie) {
      throwError('VALIDATION_ERROR', 'Movie not found');
    }

    if (movie.status !== 'ACTIVE') {
      throwError('VALIDATION_ERROR', 'Movie is not active');
    }
  }

  /**
   * Batch fetches enrichment data for a list of shows.
   * Makes one call per upstream service regardless of list size (avoids N+1).
   */
  private async fetchListEnrichmentData(shows: Show[]) {
    const movieIds = [...new Set(shows.map((s) => s.movieId))];
    const screenIds = [...new Set(shows.map((s) => s.screenId))];
    const showIds = shows.map((s) => s.id);

    const [movies, screens, prices] = await Promise.all([
      this.movieClient.getMoviesByIds(movieIds),
      this.theatreClient.getScreensByIds(screenIds),
      showIds.length
        ? this.showPriceRepository.find({ where: { showId: In(showIds) } })
        : Promise.resolve([] as ShowPrice[]),
    ]);

    const theatreIds = [...new Set(screens.map((s) => s.theatreId))];
    const theatres = await this.theatreClient.getTheatresByIds(theatreIds);

    const movieMap = new Map<number, MovieDto>(movies.map((m) => [m.id, m]));
    const screenMap = new Map<number, ScreenDto>(screens.map((s) => [s.id, s]));
    const theatreMap = new Map<number, TheatreDto>(theatres.map((t) => [t.id, t]));

    const pricingMap = new Map<number, ShowPrice[]>();
    for (const price of prices) {
      const existing = pricingMap.get(price.showId) ?? [];
      existing.push(price);
      pricingMap.set(price.showId, existing);
    }

    return { movieMap, screenMap, theatreMap, pricingMap };
  }

  /** Common base fields shared by all show responses. */
  private mapBase(show: Show) {
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

  /** List response: lean enrichment for browsing screens. */
  private mapListResponse(
    show: Show,
    movie: MovieDto | null,
    screen: ScreenDto | null,
    theatre: TheatreDto | null,
    prices: ShowPrice[],
  ) {
    return {
      ...this.mapBase(show),
      movie: movie
        ? {
            id: encryptId(movie.id),
            title: movie.title,
            language: movie.language,
            runningTimeMinutes: movie.runningTimeMinutes,
            primaryImageUrl: movie.primaryImageUrl,
          }
        : null,
      theatre: theatre
        ? {
            id: encryptId(theatre.id),
            name: theatre.name,
            city: theatre.city,
          }
        : null,
      screen: screen
        ? {
            id: encryptId(screen.id),
            name: screen.name,
          }
        : null,
      pricing: this.formatPricing(prices),
    };
  }

  /** Detail response: full enrichment for the show details screen. */
  private mapDetailResponse(
    show: Show,
    movie: MovieDto | null,
    screen: ScreenDto | null,
    theatre: TheatreDto | null,
    prices: ShowPrice[],
  ) {
    return {
      ...this.mapBase(show),
      movie: movie
        ? {
            id: encryptId(movie.id),
            title: movie.title,
            description: movie.description,
            cast: movie.cast,
            director: movie.director,
            language: movie.language,
            runningTimeMinutes: movie.runningTimeMinutes,
            ratingValue: movie.ratingValue,
            primaryImageUrl: movie.primaryImageUrl,
          }
        : null,
      theatre: theatre
        ? {
            id: encryptId(theatre.id),
            name: theatre.name,
            city: theatre.city,
            address: theatre.address,
          }
        : null,
      screen: screen
        ? {
            id: encryptId(screen.id),
            name: screen.name,
          }
        : null,
      pricing: this.formatPricing(prices),
    };
  }

  /** Mutation response: no upstream enrichment - admin already has the context. */
  private mapMutationResponse(show: Show) {
    return this.mapBase(show);
  }

  /** Formats prices keyed by seat type for easy frontend consumption. */
  private formatPricing(prices: ShowPrice[]): Record<string, { amount: number; currency: string }> {
    const result: Record<string, { amount: number; currency: string }> = {};
    for (const p of prices) {
      result[p.seatType] = { amount: p.amount, currency: p.currency };
    }
    return result;
  }
}
