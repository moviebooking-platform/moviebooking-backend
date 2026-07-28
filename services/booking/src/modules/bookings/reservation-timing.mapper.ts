import { formatUtcDateTime } from '@moviebooking/common';
import { Booking, BookingStatus } from '@moviebooking/database';

export interface ReservationTiming {
  holdExpiresAt: string | null;
  paymentExpiresAt: string | null;
  activeExpiresAt: string | null;
  remainingSeconds: number;
  message: string;
}

type TimingSource = Pick<
  Booking,
  'status' | 'holdExpiresAt' | 'paymentExpiresAt'
>;

const STATUS_MESSAGES: Record<BookingStatus, string> = {
  [BookingStatus.HOLDING]: 'Seats reserved; start payment before expiry.',
  [BookingStatus.PAYMENT_PENDING]: 'Complete payment before expiry.',
  [BookingStatus.CONFIRMED]: 'Booking confirmed.',
  [BookingStatus.FAILED]: 'Booking failed.',
  [BookingStatus.EXPIRED]: 'Reservation expired.',
  [BookingStatus.PENDING_REVIEW]: 'Booking pending review.',
};

export function mapReservationTiming(
  booking: TimingSource,
  now: Date = new Date(),
): ReservationTiming {
  const activeDeadline =
    booking.status === BookingStatus.HOLDING
      ? booking.holdExpiresAt
      : booking.status === BookingStatus.PAYMENT_PENDING
        ? booking.paymentExpiresAt
        : null;
  const activeExpiresAt = formatUtcDateTime(activeDeadline);
  const remainingSeconds = activeDeadline
    ? Math.max(
        0,
        Math.floor((new Date(activeDeadline).getTime() - now.getTime()) / 1000),
      )
    : 0;

  return {
    holdExpiresAt: formatUtcDateTime(booking.holdExpiresAt),
    paymentExpiresAt: formatUtcDateTime(booking.paymentExpiresAt),
    activeExpiresAt,
    remainingSeconds,
    message: STATUS_MESSAGES[booking.status],
  };
}
