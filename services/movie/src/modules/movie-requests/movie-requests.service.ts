import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Movie, MovieImage, MovieRequest, MovieRequestStatus, MovieStatus } from '../../entities';
import { throwError, PaginatedResponse, encryptId, ICurrentUser, ROLES } from '@moviebooking/common';
import { CreateMovieRequestDto } from './dto/create-movie-request.dto';
import { ReviewMovieRequestDto } from './dto/review-movie-request.dto';
import { ListMovieRequestsQueryDto } from './dto/list-movie-requests-query.dto';

@Injectable()
export class MovieRequestsService {
  private readonly logger = new Logger(MovieRequestsService.name);

  constructor(
    @InjectRepository(MovieRequest)
    private readonly movieRequestRepository: Repository<MovieRequest>,
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateMovieRequestDto, user: ICurrentUser) {
    // Theatre Admin must have theatreId in JWT
    if (!user.theatreId) {
      throwError('FORBIDDEN', 'No theatre assignment found');
    }

    // Check for duplicate pending request (same title + theatre)
    const duplicate = await this.movieRequestRepository.findOne({
      where: {
        theatreId: user.theatreId,
        title: dto.title,
        status: MovieRequestStatus.PENDING,
      },
    });

    if (duplicate) {
      throwError('DUPLICATE_RESOURCE', `A pending request for "${dto.title}" already exists for your theatre`);
    }

    const request = this.movieRequestRepository.create({
      ...dto,
      releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : null,
      expectedReleaseDate: dto.expectedReleaseDate ? new Date(dto.expectedReleaseDate) : null,
      theatreId: user.theatreId,
      requestedByUserId: user.id,
      status: MovieRequestStatus.PENDING,
    });

    const saved = await this.movieRequestRepository.save(request);
    this.logger.log(`Movie request created: "${saved.title}" by user ${user.id}`);
    return this.mapResponse(saved);
  }

  async findAll(query: ListMovieRequestsQueryDto, user: ICurrentUser) {
    const { page = 1, pageSize = 20, status, theatreId } = query;
    const isTheatreAdmin = user.role?.code === ROLES.THEATRE_ADMIN;

    const qb = this.movieRequestRepository.createQueryBuilder('req');

    // Theatre Admin: own requests only
    if (isTheatreAdmin) {
      qb.where('req.theatreId = :theatreId', { theatreId: user.theatreId });
    } else if (theatreId) {
      qb.where('req.theatreId = :theatreId', { theatreId });
    }

    if (status) {
      qb.andWhere('req.status = :status', { status });
    }

    qb.orderBy('req.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [requests, total] = await qb.getManyAndCount();

    return new PaginatedResponse(
      requests.map(r => this.mapResponse(r)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: number, user: ICurrentUser) {
    const request = await this.movieRequestRepository.findOne({
      where: { id },
      relations: ['createdMovie'],
    });

    if (!request) {
      throwError('NOT_FOUND', 'Movie request not found');
    }

    // Theatre Admin can only see own requests
    if (user.role?.code === ROLES.THEATRE_ADMIN && request.theatreId !== user.theatreId) {
      throwError('NOT_FOUND', 'Movie request not found');
    }

    return this.mapDetailResponse(request);
  }

  async approve(id: number, dto: ReviewMovieRequestDto, user: ICurrentUser) {
    const request = await this.movieRequestRepository.findOne({ where: { id } });

    if (!request) {
      throwError('NOT_FOUND', 'Movie request not found');
    }

    if (request.status !== MovieRequestStatus.PENDING) {
      throwError('BUSINESS_RULE_VIOLATION', 'Only PENDING requests can be approved');
    }

    // Atomic: create movie + update request in one transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create movie from request data
      const movie = queryRunner.manager.create(Movie, {
        title: request.title,
        description: request.description,
        releaseDate: request.releaseDate ?? request.expectedReleaseDate ?? new Date(),
        cast: request.cast,
        director: request.director,
        language: request.language,
        status: MovieStatus.ACTIVE,
      });

      const savedMovie = await queryRunner.manager.save(Movie, movie);

      // Update request
      request.status = MovieRequestStatus.APPROVED;
      request.reviewedByUserId = user.id;
      request.reviewedAt = new Date();
      request.reviewReason = dto.reviewReason;
      request.createdMovieId = savedMovie.id;

      const savedRequest = await queryRunner.manager.save(request);
      await queryRunner.commitTransaction();

      this.logger.log(`Movie request ${id} approved, movie created: ${savedMovie.id}`);
      return this.mapDetailResponse({ ...savedRequest, createdMovie: savedMovie });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to approve request ${id}: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reject(id: number, dto: ReviewMovieRequestDto, user: ICurrentUser) {
    const request = await this.movieRequestRepository.findOne({ where: { id } });

    if (!request) {
      throwError('NOT_FOUND', 'Movie request not found');
    }

    if (request.status !== MovieRequestStatus.PENDING) {
      throwError('BUSINESS_RULE_VIOLATION', 'Only PENDING requests can be rejected');
    }

    request.status = MovieRequestStatus.REJECTED;
    request.reviewedByUserId = user.id;
    request.reviewedAt = new Date();
    request.reviewReason = dto.reviewReason;

    const saved = await this.movieRequestRepository.save(request);
    this.logger.log(`Movie request ${id} rejected by user ${user.id}`);
    return this.mapResponse(saved);
  }

  private mapResponse(request: MovieRequest) {
    return {
      id: encryptId(request.id),
      theatreId: encryptId(request.theatreId),
      requestedByUserId: encryptId(request.requestedByUserId),
      title: request.title,
      description: request.description,
      releaseDate: request.releaseDate,
      cast: request.cast,
      director: request.director,
      language: request.language,
      expectedReleaseDate: request.expectedReleaseDate,
      notes: request.notes,
      status: request.status,
      reviewedByUserId: request.reviewedByUserId ? encryptId(request.reviewedByUserId) : null,
      reviewedAt: request.reviewedAt,
      reviewReason: request.reviewReason,
      createdMovieId: request.createdMovieId ? encryptId(request.createdMovieId) : null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private mapDetailResponse(request: MovieRequest) {
    return {
      ...this.mapResponse(request),
      createdMovie: request.createdMovie
        ? { id: encryptId(request.createdMovie.id), title: request.createdMovie.title }
        : null,
    };
  }
}
