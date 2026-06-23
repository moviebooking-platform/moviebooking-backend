import { throwError } from '@moviebooking/common';
import { BookingStatus } from '@moviebooking/database';

/**
 * Allowed booking status transitions. Terminal states map to an empty set,
 * and nothing transitions back into HOLDING — that only exists at creation.
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  [BookingStatus.HOLDING]: [
    BookingStatus.PAYMENT_PENDING,
    BookingStatus.EXPIRED,
    BookingStatus.FAILED,
  ],
  [BookingStatus.PAYMENT_PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.FAILED,
    BookingStatus.EXPIRED,
    BookingStatus.PENDING_REVIEW,
  ],
  [BookingStatus.CONFIRMED]: [],
  [BookingStatus.FAILED]: [],
  [BookingStatus.EXPIRED]: [],
  [BookingStatus.PENDING_REVIEW]: [],
};

/** Throws BUSINESS_RULE_VIOLATION when `from -> to` is not an allowed move. */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throwError(
      'BUSINESS_RULE_VIOLATION',
      `Invalid booking status transition: ${from} -> ${to}`,
    );
  }
}
