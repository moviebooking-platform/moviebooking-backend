import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie, MovieStatus } from '../../entities';

export interface InternalMovieResponse {
  id: number;
  title: string;
  status: MovieStatus;
  runningTimeMinutes: number | null;
  releaseDate: Date;
  language: string | null;
}


// Provides internal data access for service-to-service communication.

@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
  ) {}

// Fetches a movie by ID for internal use. Returns null if not found.
  async getMovieById(id: number): Promise<InternalMovieResponse | null> {
    const movie = await this.movieRepository.findOne({ where: { id } });
    if (!movie) return null;
    return this.mapMovie(movie);
  }

  private mapMovie(movie: Movie): InternalMovieResponse {
    return {
      id: movie.id,
      title: movie.title,
      status: movie.status,
      runningTimeMinutes: movie.runningTimeMinutes,
      releaseDate: movie.releaseDate,
      language: movie.language,
    };
  }
}
