import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie, MovieImage, MovieStatus } from '../../entities';
import { throwError, PaginatedResponse, encryptId, ICurrentUser } from '@moviebooking/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { ListMoviesQueryDto } from './dto/list-movies-query.dto';

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(MovieImage)
    private readonly movieImageRepository: Repository<MovieImage>,
  ) {}

  async create(dto: CreateMovieDto) {
    // Duplicate check: same title + release date
    await this.checkMovieDuplicate(dto.title, dto.releaseDate);

    const movie = this.movieRepository.create({
      ...dto,
      releaseDate: new Date(dto.releaseDate),
      status: MovieStatus.ACTIVE,
    });

    const saved = await this.movieRepository.save(movie);
    this.logger.log(`Movie created: ${saved.title} (${saved.releaseDate})`);
    return this.mapResponse(saved);
  }

  async findAll(query: ListMoviesQueryDto, user?: ICurrentUser) {
    const { page = 1, pageSize = 20, search, language, releaseYear, releaseDate, status } = query;

    const qb = this.movieRepository.createQueryBuilder('movie');

    // Guest: ACTIVE only; authenticated: all
    if (!user) {
      qb.where('movie.status = :status', { status: MovieStatus.ACTIVE });
    } else if (status) {
      qb.where('movie.status = :status', { status });
    }

    if (search) {
      qb.andWhere('movie.title LIKE :search', { search: `%${search}%` });
    }

    if (language) {
      qb.andWhere('movie.language = :language', { language });
    }

    if (releaseYear) {
      qb.andWhere('YEAR(movie.releaseDate) = :releaseYear', { releaseYear });
    }

    if (releaseDate) {
      qb.andWhere('movie.releaseDate = :releaseDate', { releaseDate });
    }

    qb.orderBy('movie.releaseDate', 'DESC')
      .addOrderBy('movie.title', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [movies, total] = await qb.getManyAndCount();

    // Batch fetch primary images for all movies (avoid N+1)
    const movieIds = movies.map(m => m.id);
    const primaryImages = movieIds.length > 0
      ? await this.movieImageRepository
          .createQueryBuilder('img')
          .where('img.movieId IN (:...movieIds)', { movieIds })
          .andWhere('img.isPrimary = :isPrimary', { isPrimary: true })
          .getMany()
      : [];

    const imageMap = new Map(primaryImages.map(img => [img.movieId, img.imageUrl]));

    return new PaginatedResponse(
      movies.map(m => this.mapListResponse(m, imageMap.get(m.id))),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: number, user?: ICurrentUser) {
    const movie = await this.movieRepository.findOne({
      where: { id },
      relations: ['images'],
    });

    if (!movie) {
      throwError('NOT_FOUND', 'Movie not found');
    }

    // Guest: only ACTIVE
    if (!user && movie.status !== MovieStatus.ACTIVE) {
      throwError('NOT_FOUND', 'Movie not found');
    }

    return this.mapDetailResponse(movie);
  }

  async update(id: number, dto: UpdateMovieDto) {
    const movie = await this.movieRepository.findOne({ where: { id } });

    if (!movie) {
      throwError('NOT_FOUND', 'Movie not found');
    }

    // If changing title or releaseDate, check for duplicates
    if (dto.title !== undefined || dto.releaseDate !== undefined) {
      const newTitle = dto.title ?? movie.title;
      const currentReleaseDate = movie.releaseDate instanceof Date
        ? movie.releaseDate.toISOString().split('T')[0]
        : String(movie.releaseDate).split('T')[0];
      const newReleaseDate = dto.releaseDate ?? currentReleaseDate;

      if (newTitle !== movie.title || newReleaseDate !== currentReleaseDate) {
        await this.checkMovieDuplicate(newTitle, newReleaseDate, id);
      }
    }

    if (dto.releaseDate) {
      (dto as any).releaseDate = new Date(dto.releaseDate);
    }

    Object.assign(movie, dto);
    const updated = await this.movieRepository.save(movie);
    return this.mapResponse(updated);
  }

  // Helper Methods

  private async checkMovieDuplicate(title: string, releaseDate: string, excludeId?: number) {
    const qb = this.movieRepository
      .createQueryBuilder('movie')
      .where('movie.title = :title', { title })
      .andWhere('movie.releaseDate = :releaseDate', { releaseDate });

    if (excludeId) {
      qb.andWhere('movie.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();

    if (existing) {
      throwError('DUPLICATE_RESOURCE', `Movie "${title}" with release date ${releaseDate} already exists`);
    }
  }

  private mapResponse(movie: Movie) {
    return {
      id: encryptId(movie.id),
      title: movie.title,
      description: movie.description,
      releaseDate: movie.releaseDate,
      cast: movie.cast,
      director: movie.director,
      language: movie.language,
      runningTimeMinutes: movie.runningTimeMinutes,
      ratingValue: movie.ratingValue,
      ratingMax: movie.ratingMax,
      status: movie.status,
      createdAt: movie.createdAt,
      updatedAt: movie.updatedAt,
    };
  }

  private mapListResponse(movie: Movie, primaryImageUrl?: string) {
    return {
      ...this.mapResponse(movie),
      primaryImageUrl: primaryImageUrl ?? null,
    };
  }

  private mapDetailResponse(movie: Movie) {
    const primaryImage = movie.images?.find((img: MovieImage) => img.isPrimary);
    return {
      ...this.mapResponse(movie),
      primaryImageUrl: primaryImage?.imageUrl ?? null,
      images: movie.images?.map((img: MovieImage) => ({
        id: encryptId(img.id),
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary,
      })) ?? [],
    };
  }
}
