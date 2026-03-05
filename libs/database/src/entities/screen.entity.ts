import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Theatre } from './theatre.entity';
import { ScreenStatus } from '../enums';
import { Seat } from './seat.entity';

@Entity('screens')
export class Screen extends BaseEntity {
  @Column({ name: 'theatre_id' })
  theatreId: number;

  @ManyToOne(() => Theatre, (theatre) => theatre.screens)
  @JoinColumn({ name: 'theatre_id' })
  theatre: Theatre;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ScreenStatus.ACTIVE,
  })
  status: ScreenStatus;

  @OneToMany(() => Seat, (seat) => seat.screen)
  seats: Seat[];
}
