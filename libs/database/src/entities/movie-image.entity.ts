import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Movie } from './movie.entity';

@Entity('movie_images')
export class MovieImage extends BaseEntity {
  @Column({ name: 'movie_id' })
  movieId: number;

  @ManyToOne(() => Movie, (movie) => movie.images)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @Column({ type: 'varchar', length: 500, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'bit', name: 'is_primary', default: false })
  isPrimary: boolean;
}
