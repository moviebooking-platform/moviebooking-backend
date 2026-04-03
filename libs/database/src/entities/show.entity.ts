import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Screen } from './screen.entity';
import { Movie } from './movie.entity';
import { ShowPrice } from './show-price.entity';
import { ShowStatus } from '../enums';

/**
 * Show entity represents a scheduled screening of a movie on a specific screen.
 * Manages show timing, status, and relationships to screens, movies, and pricing.
 */
@Entity('shows')
@Index(['screenId', 'startsAt'])
@Index(['screenId', 'status', 'startsAt'])
@Index(['movieId', 'startsAt'])
@Index(['startsAt'])
@Index(['status'])
export class Show extends BaseEntity {
  @Column({ name: 'screen_id', type: 'int' })
  screenId: number;

  @ManyToOne(() => Screen)
  @JoinColumn({ name: 'screen_id' })
  screen: Screen;

  @Column({ name: 'movie_id', type: 'int' })
  movieId: number;

  @ManyToOne(() => Movie)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @Column({ name: 'starts_at', type: 'datetime2' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'datetime2' })
  endsAt: Date;

  @Column({ type: 'varchar', length: 20, default: ShowStatus.ACTIVE })
  status: ShowStatus;

  @OneToMany(() => ShowPrice, (price) => price.show)
  prices: ShowPrice[];
}
