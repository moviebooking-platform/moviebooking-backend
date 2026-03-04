import { Entity, Column, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Screen } from './screen.entity';
import { SeatType, SeatStatus } from '../enums';

@Entity('seats')
export class Seat extends BaseEntity {
  @Column({ name: 'screen_id' })
  screenId: number;

  @ManyToOne(() => Screen, (screen) => screen.seats)
  @JoinColumn({ name: 'screen_id' })
  screen: Screen;

  @Column({ type: 'varchar', length: 10, name: 'seat_code' })
  seatCode: string;

  @Column({ type: 'varchar', length: 10, name: 'row_label' })
  rowLabel: string;

  @Column({ type: 'int', name: 'seat_number' })
  seatNumber: number;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'seat_type',
  })
  seatType: SeatType;

  @Column({
    type: 'varchar',
    length: 20,
    default: SeatStatus.ACTIVE,
  })
  status: SeatStatus;

  @BeforeInsert()
  @BeforeUpdate()
  generateSeatCode() {
    if (this.rowLabel && this.seatNumber) {
      this.seatCode = `${this.rowLabel}${this.seatNumber}`;
    }
  }
}
