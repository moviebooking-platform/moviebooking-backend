import { AppException } from '@moviebooking/common';
import { BookingStatus } from '@moviebooking/database';
import { assertTransition } from './booking-state';

const ALLOWED: [BookingStatus, BookingStatus][] = [
  [BookingStatus.HOLDING, BookingStatus.PAYMENT_PENDING],
  [BookingStatus.HOLDING, BookingStatus.EXPIRED],
  [BookingStatus.HOLDING, BookingStatus.FAILED],
  [BookingStatus.PAYMENT_PENDING, BookingStatus.CONFIRMED],
  [BookingStatus.PAYMENT_PENDING, BookingStatus.FAILED],
  [BookingStatus.PAYMENT_PENDING, BookingStatus.EXPIRED],
  [BookingStatus.PAYMENT_PENDING, BookingStatus.PENDING_REVIEW],
];

const TERMINAL_STATES = [
  BookingStatus.CONFIRMED,
  BookingStatus.FAILED,
  BookingStatus.EXPIRED,
  BookingStatus.PENDING_REVIEW,
];

const ALL_STATES = Object.values(BookingStatus);

/** Builds the set of allowed pairs as strings for quick membership checks. */
const allowedSet = new Set(ALLOWED.map(([from, to]) => `${from}->${to}`));

describe('assertTransition', () => {
  describe('allowed transitions', () => {
    it.each(ALLOWED)('permits %s -> %s', (from, to) => {
      expect(() => assertTransition(from, to)).not.toThrow();
    });
  });

  describe('forbidden transitions', () => {
    it.each(ALL_STATES.filter((s) => s !== BookingStatus.HOLDING))(
      'rejects %s -> HOLDING (no transition back into HOLDING)',
      (from) => {
        expect(() => assertTransition(from, BookingStatus.HOLDING)).toThrow(
          AppException,
        );
      },
    );

    it.each(TERMINAL_STATES)(
      'rejects any move out of terminal state %s',
      (from) => {
        for (const to of ALL_STATES) {
          expect(() => assertTransition(from, to)).toThrow(AppException);
        }
      },
    );

    it('rejects a same-state transition (CONFIRMED -> CONFIRMED)', () => {
      expect(() =>
        assertTransition(BookingStatus.CONFIRMED, BookingStatus.CONFIRMED),
      ).toThrow(AppException);
    });

    it('rejects HOLDING -> CONFIRMED (must go through PAYMENT_PENDING)', () => {
      expect(() =>
        assertTransition(BookingStatus.HOLDING, BookingStatus.CONFIRMED),
      ).toThrow(AppException);
    });

    it('throws BUSINESS_RULE_VIOLATION with the right error code', () => {
      try {
        assertTransition(BookingStatus.CONFIRMED, BookingStatus.FAILED);
        fail('expected assertTransition to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(AppException);
        expect((err as AppException).errorCode).toBe('BUSINESS_RULE_VIOLATION');
      }
    });
  });

  it('every status pair outside the allowed map throws', () => {
    for (const from of ALL_STATES) {
      for (const to of ALL_STATES) {
        if (allowedSet.has(`${from}->${to}`)) continue;
        expect(() => assertTransition(from, to)).toThrow(AppException);
      }
    }
  });
});
