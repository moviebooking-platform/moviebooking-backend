import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Movie, MovieImage, MovieStatus } from '../../entities';

export interface InternalMovieResponse {
  id: number;
  title: string;
  status: MovieStatus;
  description: string | null;
  cast: string | null;
  director: string | null;
  language: string | null;
  runningTimeMinutes: number | null;
  ratingValue: number | null;
  releaseDate: Date;
  primaryImageUrl: string | null;
}

/** Provides internal data access for service-to-service communication. */
@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(MovieImage)
    private readonly movieImageRepository: Repository<MovieImage>,
  ) {}

  /** Fetches a movie by ID. Returns null if not found. */
  async getMovieById(id: number): Promise<InternalMovieResponse | null> {
    const movie = await this.movieRepository.findOne({ where: { id } });
    if (!movie) return null;

    const primaryImage = await this.movieImageRepository.findOne({
      where: { movieId: id, isPrimary: true },
    });

    return this.mapMovie(movie, primaryImage?.imageUrl ?? null);
  }

  /** Fetches multiple movies in a single query for efficient batch enrichment. */
  async getMoviesByIds(ids: number[]): Promise<InternalMovieResponse[]> {
    if (!ids.length) return [];

    const [movies, images] = await Promise.all([
      this.movieRepository.find({ where: { id: In(ids) } }),
      this.movieImageRepository.find({
        where: { movieId: In(ids), isPrimary: true },
      }),
    ]);

    const imageMap = new Map(images.map((img) => [img.movieId, img.imageUrl]));
    return movies.map((m) => this.mapMovie(m, imageMap.get(m.id) ?? null));
  }

  private mapMovie(movie: Movie, primaryImageUrl: string | null): InternalMovieResponse {
    return {
      id: movie.id,
      title: movie.title,
      status: movie.status,
      description: movie.description,
      cast: movie.cast,
      director: movie.director,
      language: movie.language,
      runningTimeMinutes: movie.runningTimeMinutes,
      ratingValue: movie.ratingValue,
      releaseDate: movie.releaseDate,
      primaryImageUrl,
    };
  }
}
