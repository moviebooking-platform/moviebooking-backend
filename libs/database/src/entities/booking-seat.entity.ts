import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Booking } from './booking.entity';
import { SeatType } from '../enums';

/**
 * BookingSeat — a per-seat line of a booking with an immutable price snapshot.
 */
@Entity('booking_seats')
@Index('uq_booking_seats_booking_seat', ['bookingId', 'seatId'], {
  unique: true,
})
@Index('idx_booking_seats_booking', ['bookingId'])
@Index('idx_booking_seats_seat', ['seatId'])
@Index('idx_booking_seats_show_seat', ['showId', 'seatId'])
export class BookingSeat extends BaseEntity {
  @Column({ name: 'booking_id', type: 'int' })
  bookingId: number;

  @ManyToOne(() => Booking, (booking) => booking.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'show_id', type: 'int' })
  showId: number;

  @Column({ name: 'seat_id', type: 'int' })
  seatId: number;

  @Column({ name: 'seat_type', type: 'varchar', length: 20 })
  seatType: SeatType;

  @Column({ name: 'price_cents', type: 'int' })
  priceCents: number;
}
