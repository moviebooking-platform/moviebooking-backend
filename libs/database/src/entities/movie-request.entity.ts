import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Movie } from './movie.entity';
import { MovieRequestStatus } from '../enums';

@Entity('movie_requests')
export class MovieRequest extends BaseEntity {
  @Column({ name: 'theatre_id' })
  theatreId: number;

  @Column({ name: 'requested_by_user_id' })
  requestedByUserId: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date', name: 'release_date', nullable: true })
  releaseDate: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cast: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  director: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  language: string | null;

  @Column({ type: 'date', name: 'expected_release_date', nullable: true })
  expectedReleaseDate: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 20, default: MovieRequestStatus.PENDING })
  status: MovieRequestStatus;

  @Column({ type: 'int', name: 'reviewed_by_user_id', nullable: true })
  reviewedByUserId: number | null;

  @Column({ type: 'datetime2', name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', name: 'review_reason', nullable: true })
  reviewReason: string | null;

  @Column({ type: 'int', name: 'created_movie_id', nullable: true })
  createdMovieId: number | null;

  @ManyToOne(() => Movie, { nullable: true })
  @JoinColumn({ name: 'created_movie_id' })
  createdMovie: Movie | null;
}
