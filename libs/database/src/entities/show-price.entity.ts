import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Show } from './show.entity';
import { SeatType } from '../enums';

// ShowPrice entity represents pricing configuration per seat type for a show.

@Entity('show_prices')
@Index(['showId', 'seatType'], { unique: true })
@Index(['showId'])
export class ShowPrice extends BaseEntity {
  @Column({ name: 'show_id', type: 'int' })
  showId: number;

  @ManyToOne(() => Show, (show) => show.prices)
  @JoinColumn({ name: 'show_id' })
  show: Show;

  @Column({ name: 'seat_type', type: 'varchar', length: 20 })
  seatType: SeatType;

  @Column({ name: 'amount', type: 'int' })
  amount: number;

  @Column({ type: 'char', length: 3, default: 'GBP' })
  currency: string;
}
