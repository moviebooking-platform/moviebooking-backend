import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { MovieImage } from './movie-image.entity';
import { MovieStatus } from '../enums';

@Entity('movies')
export class Movie extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date', name: 'release_date' })
  releaseDate: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cast: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  director: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  language: string | null;

  @Column({ type: 'int', name: 'running_time_minutes', nullable: true })
  runningTimeMinutes: number | null;

  @Column({ type: 'decimal', precision: 3, scale: 1, name: 'rating_value', nullable: true })
  ratingValue: number | null;

  @Column({ type: 'decimal', precision: 3, scale: 1, name: 'rating_max', nullable: true, default: 10 })
  ratingMax: number | null;

  @Column({ type: 'varchar', length: 20, default: MovieStatus.ACTIVE })
  status: MovieStatus;

  @OneToMany(() => MovieImage, (image) => image.movie)
  images: MovieImage[];
}
