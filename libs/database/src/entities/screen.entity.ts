import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Theatre } from './theatre.entity';
import { ScreenStatus } from '../enums';

@Entity('screens')
export class Screen extends BaseEntity {
  @Column({ name: 'theatre_id' })
  theatreId: number;

  @ManyToOne(() => Theatre)
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

  // Relations will be added when Seat entity is imported
  // @OneToMany(() => Seat, (seat) => seat.screen)
  // seats: Seat[];
}
