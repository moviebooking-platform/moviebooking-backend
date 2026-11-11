import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  SeatHold,
  SeatHoldStatus,
} from '@moviebooking/database';
import { InternalTransitionsService } from './internal-transitions.service';
import { BookingEventsPublisher } from '../../messaging/booking-events.publisher';
import {
  defaultsOnlyConfig,
  expectAppError,
  fakeDataSource,
} from '../../testing/test-helpers';

const MINUTE = 60 * 1000;

function makeBooking(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: 7,
    bookingRef: 'REF0000001',
    showId: 1,
    email: 'guest@example.com',
    status: BookingStatus.HOLDING,
    holdExpiresAt: new Date(now + 4 * MINUTE),
    paymentExpiresAt: null as Date | null,
    totalAmountCents: 2500,
    currency: 'GBP',
    needsReviewReason: null as string | null,
    createdAt: new Date(now - MINUTE),
    seats: [] as unknown[],
    ...overrides,
  };
}

/** Manager whose findOne returns `booking`; counts default to "one hold per seat". */
function fakeManager(
  booking: ReturnType<typeof makeBooking> | null,
  counts = { seats: 2, activeHolds: 2 },
) {
  return {
    findOne: jest.fn().mockResolvedValue(booking),
    find: jest.fn().mockResolvedValue(booking?.seats ?? []),
    count: jest.fn(async (entity: unknown) =>
      entity === SeatHold ? counts.activeHolds : counts.seats,
    ),
    save: jest.fn(async (_entity: unknown, value: unknown) => value),
    update: jest.fn().mockResolvedValue({ affected: 2 }),
  };
}

function buildService(manager: ReturnType<typeof fakeManager>) {
  const publisher = {
    publishConfirmed: jest.fn().mockResolvedValue(undefined),
    publishFailed: jest.fn().mockResolvedValue(undefined),
  };
  const service = new InternalTransitionsService(
    fakeDataSource(manager),
    publisher as unknown as BookingEventsPublisher,
    defaultsOnlyConfig as unknown as ConfigService,
  );
  return { service, publisher };
}

describe('InternalTransitionsService', () => {
  describe('unknown booking reference returns 404 (not 500)', () => {
    it.each(['markPaymentPending', 'confirmBooking', 'failBooking'] as const)(
      '%s',
      async (method) => {
        const { service } = buildService(fakeManager(null));
        await expectAppError(service[method]('NOPE'), 404);
      },
    );
  });

  describe('markPaymentPending', () => {
    it('moves HOLDING to PAYMENT_PENDING and extends active holds to the deadline', async () => {
      const booking = makeBooking();
      const manager = fakeManager(booking);
      const { service } = buildService(manager);

      const result = await service.markPaymentPending(booking.bookingRef);

      expect(result.status).toBe(BookingStatus.PAYMENT_PENDING);
      expect(booking.paymentExpiresAt).toBeInstanceOf(Date);
      expect(manager.update).toHaveBeenCalledWith(
        SeatHold,
        { bookingId: booking.id, status: SeatHoldStatus.ACTIVE },
        { expiresAt: booking.paymentExpiresAt },
      );
    });

    it('is idempotent for a booking already in PAYMENT_PENDING', async () => {
      const manager = fakeManager(
        makeBooking({
          status: BookingStatus.PAYMENT_PENDING,
          paymentExpiresAt: new Date(Date.now() + 5 * MINUTE),
        }),
      );
      const { service } = buildService(manager);

      const result = await service.markPaymentPending('REF0000001');

      expect(result.status).toBe(BookingStatus.PAYMENT_PENDING);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('returns 422 for a booking that is not HOLDING', async () => {
      const { service } = buildService(
        fakeManager(makeBooking({ status: BookingStatus.CONFIRMED })),
      );
      await expectAppError(service.markPaymentPending('REF0000001'), 422);
    });

    it('returns 422 when the hold has already expired', async () => {
      const { service } = buildService(
        fakeManager(makeBooking({ holdExpiresAt: new Date(Date.now() - 1000) })),
      );
      await expectAppError(service.markPaymentPending('REF0000001'), 422);
    });

    it('returns 422 when not every seat has an active hold', async () => {
      const { service } = buildService(
        fakeManager(makeBooking(), { seats: 2, activeHolds: 1 }),
      );
      await expectAppError(service.markPaymentPending('REF0000001'), 422);
    });
  });

  describe('confirmBooking', () => {
    it('returns 422 for an EXPIRED booking', async () => {
      const { service, publisher } = buildService(
        fakeManager(makeBooking({ status: BookingStatus.EXPIRED })),
      );
      await expectAppError(service.confirmBooking('REF0000001'), 422);
      expect(publisher.publishConfirmed).not.toHaveBeenCalled();
    });

    it('is idempotent for an already CONFIRMED booking and publishes nothing', async () => {
      const manager = fakeManager(
        makeBooking({ status: BookingStatus.CONFIRMED }),
      );
      const { service, publisher } = buildService(manager);

      const result = await service.confirmBooking('REF0000001');

      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(manager.save).not.toHaveBeenCalled();
      expect(publisher.publishConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('failBooking', () => {
    it('returns 422 for a CONFIRMED booking', async () => {
      const { service } = buildService(
        fakeManager(makeBooking({ status: BookingStatus.CONFIRMED })),
      );
      await expectAppError(service.failBooking('REF0000001'), 422);
    });

    it('is idempotent for an already FAILED booking', async () => {
      const { service, publisher } = buildService(
        fakeManager(makeBooking({ status: BookingStatus.FAILED })),
      );
      const result = await service.failBooking('REF0000001');
      expect(result.status).toBe(BookingStatus.FAILED);
      expect(publisher.publishFailed).not.toHaveBeenCalled();
    });

    it('marks a PAYMENT_PENDING booking FAILED, releases holds and publishes', async () => {
      const booking = makeBooking({ status: BookingStatus.PAYMENT_PENDING });
      const manager = fakeManager(booking);
      const { service, publisher } = buildService(manager);

      await service.failBooking(booking.bookingRef);

      expect(booking.status).toBe(BookingStatus.FAILED);
      expect(manager.update).toHaveBeenCalledWith(
        SeatHold,
        { bookingId: booking.id, status: SeatHoldStatus.ACTIVE },
        { status: SeatHoldStatus.RELEASED },
      );
      expect(publisher.publishFailed).toHaveBeenCalledWith({
        bookingRef: booking.bookingRef,
        showId: booking.showId,
      });
    });
  });
});
