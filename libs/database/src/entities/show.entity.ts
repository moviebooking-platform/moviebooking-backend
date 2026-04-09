import {
  Entity,
  Column,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { ShowPrice } from './show-price.entity';
import { ShowStatus } from '../enums';

/**
 * Show entity represents a scheduled screening of a movie on a specific screen.
 * Stores foreign key IDs for screen and movie
 * Related data fetched via Theatre Service and Movie Service APIs.
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

  @Column({ name: 'movie_id', type: 'int' })
  movieId: number;

  @Column({ name: 'starts_at', type: 'datetime2' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'datetime2' })
  endsAt: Date;

  @Column({ type: 'varchar', length: 20, default: ShowStatus.ACTIVE })
  status: ShowStatus;

  @OneToMany(() => ShowPrice, (price) => price.show)
  prices: ShowPrice[];
}
