import { Repository } from 'typeorm';
import {
  Booking,
  BookingStatus,
  SeatHold,
  SeatHoldStatus,
} from '@moviebooking/database';
import { BookingCancelService } from './booking-cancel.service';
import { BookingEventsPublisher } from '../../messaging/booking-events.publisher';
import { expectAppError, fakeDataSource } from '../../testing/test-helpers';

function makeBooking(status = BookingStatus.HOLDING) {
  return {
    id: 3,
    bookingRef: 'REF0000003',
    showId: 9,
    email: 'Guest@Example.com',
    status,
  };
}

function build(booking: ReturnType<typeof makeBooking> | null) {
  const manager = {
    findOne: jest.fn().mockResolvedValue(booking),
    save: jest.fn(async (_entity: unknown, value: unknown) => value),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const bookingRepo = {
    findOne: jest.fn().mockResolvedValue({ ...booking, seats: [], holds: [] }),
  };
  const publisher = { publishFailed: jest.fn().mockResolvedValue(undefined) };
  const service = new BookingCancelService(
    fakeDataSource(manager),
    bookingRepo as unknown as Repository<Booking>,
    publisher as unknown as BookingEventsPublisher,
  );
  return { service, manager, publisher };
}

describe('BookingCancelService', () => {
  it('cancels a HOLDING booking: locks the row, marks FAILED, releases holds, publishes', async () => {
    const booking = makeBooking();
    const { service, manager, publisher } = build(booking);

    await service.cancelBooking(booking.bookingRef, 'guest@example.com');

    expect(manager.findOne).toHaveBeenCalledWith(Booking, {
      where: { bookingRef: booking.bookingRef },
      lock: { mode: 'pessimistic_write' },
    });
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

  it('matches the email case-insensitively and ignores surrounding spaces', async () => {
    const { service } = build(makeBooking());
    await expect(
      service.cancelBooking('REF0000003', '  GUEST@example.COM '),
    ).resolves.toBeDefined();
  });

  it('returns 404 for an unknown reference', async () => {
    const { service } = build(null);
    await expectAppError(
      service.cancelBooking('NOPE', 'guest@example.com'),
      404,
    );
  });

  it('returns 404 (not 403) when the email does not match', async () => {
    const { service, manager, publisher } = build(makeBooking());
    await expectAppError(
      service.cancelBooking('REF0000003', 'someone@else.com'),
      404,
    );
    expect(manager.save).not.toHaveBeenCalled();
    expect(publisher.publishFailed).not.toHaveBeenCalled();
  });

  it.each([
    BookingStatus.PAYMENT_PENDING,
    BookingStatus.CONFIRMED,
    BookingStatus.EXPIRED,
    BookingStatus.FAILED,
    BookingStatus.PENDING_REVIEW,
  ])('returns 422 and changes nothing for a %s booking', async (status) => {
    const { service, manager } = build(makeBooking(status));
    await expectAppError(
      service.cancelBooking('REF0000003', 'guest@example.com'),
      422,
    );
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });
});
