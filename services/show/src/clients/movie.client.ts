import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseServiceClient } from '@moviebooking/common';

export interface MovieDto {
  id: number;
  title: string;
  status: string;
  description: string | null;
  cast: string | null;
  director: string | null;
  language: string | null;
  runningTimeMinutes: number | null;
  ratingValue: number | null;
  releaseDate: Date;
  primaryImageUrl: string | null;
}

/** Client for the Movie Service internal APIs. */
@Injectable()
export class MovieClient extends BaseServiceClient {
  constructor(httpService: HttpService) {
    super(httpService, 'MovieClient');
  }

  /** Fetches a single movie by ID. Returns null if not found or service unavailable. */
  async getMovie(movieId: number): Promise<MovieDto | null> {
    return this.get<MovieDto>(`/api/internal/movies/${movieId}`);
  }

  /** Fetches multiple movies in a single call. Returns empty array on failure. */
  async getMoviesByIds(movieIds: number[]): Promise<MovieDto[]> {
    if (!movieIds.length) return [];
    const result = await this.post<MovieDto[]>('/api/internal/movies/batch', { movieIds });
    return result ?? [];
  }

  /** Returns true only if the movie exists and has ACTIVE status. */
  async isMovieActive(movieId: number): Promise<boolean> {
    const movie = await this.getMovie(movieId);
    return movie?.status === 'ACTIVE';
  }
}
