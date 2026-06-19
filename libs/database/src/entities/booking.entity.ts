import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { BookingStatus } from '../enums';
import { BookingSeat } from './booking-seat.entity';
import { SeatHold } from './seat-hold.entity';

/**
 * Booking entity — a guest's attempt to purchase seats for one show.
 */
@Entity('bookings')
@Index('idx_bookings_ref', ['bookingRef'], { unique: true })
@Index('idx_bookings_show', ['showId'])
@Index('idx_bookings_status', ['status'])
@Index('idx_bookings_hold_expires', ['status', 'holdExpiresAt'])
@Index('idx_bookings_email', ['email'])
@Index('idx_bookings_created', ['createdAt'])
export class Booking extends BaseEntity {
  @Column({ name: 'booking_ref', type: 'varchar', length: 32 })
  bookingRef: string;

  @Column({ name: 'show_id', type: 'int' })
  showId: number;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20, default: BookingStatus.HOLDING })
  status: BookingStatus;

  @Column({ name: 'hold_expires_at', type: 'datetime2', nullable: true })
  holdExpiresAt: Date | null;

  @Column({ name: 'total_amount_cents', type: 'int' })
  totalAmountCents: number;

  @Column({ type: 'char', length: 3, default: 'GBP' })
  currency: string;

  @Column({
    name: 'needs_review_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  needsReviewReason: string | null;

  @OneToMany(() => BookingSeat, (seat) => seat.booking)
  seats: BookingSeat[];

  @OneToMany(() => SeatHold, (hold) => hold.booking)
  holds: SeatHold[];
}
