import { Injectable } from '@nestjs/common';
import { BaseServiceClient } from '@moviebooking/common';

export interface MovieDto {
  id: number;
  title: string;
  status: string;
  runningTimeMinutes: number | null;
  releaseDate: Date;
  language: string | null;
}

/**
 * Client for communicating with Movie Service.
 * Provides methods to fetch movie data and validate movie status for show scheduling.
 */
@Injectable()
export class MovieClient extends BaseServiceClient {
  /**
   * Fetches movie details by ID from Movie Service.
   * Returns null if movie not found.
   */
  async getMovie(movieId: number): Promise<MovieDto | null> {
    try {
      return await this.get<MovieDto>(`/api/internal/movies/${movieId}`);
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Checks if a movie exists and has ACTIVE status.
   * Returns true if movie is active, false if not found or inactive.
   */
  async isMovieActive(movieId: number): Promise<boolean> {
    try {
      const movie = await this.getMovie(movieId);
      if (!movie) {
        return false;
      }
      return movie.status === 'ACTIVE';
    } catch (error) {
      // If service is unavailable, throw error to be handled by circuit breaker
      throw error;
    }
  }
}
