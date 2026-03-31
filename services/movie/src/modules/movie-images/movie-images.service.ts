import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Movie, MovieImage, MovieStatus } from '../../entities';
import { throwError, encryptId } from '@moviebooking/common';
import { CreateMovieImageDto } from './dto/create-movie-image.dto';
import { UpdateMovieImageDto } from './dto/update-movie-image.dto';

@Injectable()
export class MovieImagesService {
  private readonly logger = new Logger(MovieImagesService.name);

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(MovieImage)
    private readonly movieImageRepository: Repository<MovieImage>,
    private readonly dataSource: DataSource,
  ) {}

  async create(movieId: number, dto: CreateMovieImageDto) {
    await this.verifyMovieExists(movieId);

    // If setting as primary, unset existing primary in transaction
    if (dto.isPrimary) {
      return this.createWithPrimarySwap(movieId, dto);
    }

    const image = this.movieImageRepository.create({ ...dto, movieId });
    const saved = await this.movieImageRepository.save(image);
    return this.mapResponse(saved);
  }

  async update(imageId: number, dto: UpdateMovieImageDto) {
    const image = await this.movieImageRepository.findOne({ where: { id: imageId } });

    if (!image) {
      throwError('NOT_FOUND', 'Image not found');
    }

    if (dto.isPrimary && !image.isPrimary) {
      return this.setPrimaryWithSwap(image);
    }

    Object.assign(image, dto);
    const updated = await this.movieImageRepository.save(image);
    return this.mapResponse(updated);
  }

  async remove(imageId: number) {
    const image = await this.movieImageRepository.findOne({ where: { id: imageId } });

    if (!image) {
      throwError('NOT_FOUND', 'Image not found');
    }

    await this.movieImageRepository.remove(image);
    return { message: 'Image deleted successfully' };
  }

  // Helper Methods

  private async verifyMovieExists(movieId: number) {
    const movie = await this.movieRepository.findOne({ where: { id: movieId } });
    if (!movie) {
      throwError('NOT_FOUND', 'Movie not found');
    }
    return movie;
  }

  // Minimal transaction: unset old primary, set new primary atomically
  private async createWithPrimarySwap(movieId: number, dto: CreateMovieImageDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Unset existing primary
      await queryRunner.manager.update(MovieImage, { movieId, isPrimary: true }, { isPrimary: false });

      const image = queryRunner.manager.create(MovieImage, { ...dto, movieId });
      const saved = await queryRunner.manager.save(image);

      await queryRunner.commitTransaction();
      return this.mapResponse(saved);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async setPrimaryWithSwap(newPrimary: MovieImage) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(MovieImage, { movieId: newPrimary.movieId, isPrimary: true }, { isPrimary: false });
      newPrimary.isPrimary = true;
      const saved = await queryRunner.manager.save(newPrimary);

      await queryRunner.commitTransaction();
      return this.mapResponse(saved);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private mapResponse(image: MovieImage) {
    return {
      id: encryptId(image.id),
      movieId: encryptId(image.movieId),
      imageUrl: image.imageUrl,
      isPrimary: image.isPrimary,
      createdAt: image.createdAt,
    };
  }
}
