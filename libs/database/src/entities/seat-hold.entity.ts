import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Booking } from './booking.entity';
import { SeatHoldStatus } from '../enums';

/**
 * SeatHold — a temporary reservation of one seat for one booking.
 * expires_at is the durable hold clock (independent of the Redis lock).
 * The filtered unique index on (show_id, seat_id) WHERE status='ACTIVE'
 * is created in the migration, not here.
 */
@Entity('seat_holds')
@Index('idx_seat_holds_booking', ['bookingId'])
@Index('idx_seat_holds_expiry', ['status', 'expiresAt'])
@Index('idx_seat_holds_show_seat_status', ['showId', 'seatId', 'status'])
export class SeatHold extends BaseEntity {
  @Column({ name: 'booking_id', type: 'int' })
  bookingId: number;

  @ManyToOne(() => Booking, (booking) => booking.holds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'show_id', type: 'int' })
  showId: number;

  @Column({ name: 'seat_id', type: 'int' })
  seatId: number;

  @Column({ type: 'varchar', length: 20, default: SeatHoldStatus.ACTIVE })
  status: SeatHoldStatus;

  // Durable hold clock — sole source of truth for hold validity.
  @Column({ name: 'expires_at', type: 'datetime2' })
  expiresAt: Date;
}
