import { FindOperator, Repository } from 'typeorm';
import {
  Booking,
  BookingStatus,
  SeatHold,
  SeatHoldStatus,
} from '@moviebooking/database';
import { HoldSweepService, SWEEP_BATCH_SIZE } from './hold-sweep.service';
import { BookingEventsPublisher } from '../../messaging/booking-events.publisher';
import { fakeDataSource } from '../../testing/test-helpers';

const past = () => new Date(Date.now() - 60_000);
const future = () => new Date(Date.now() + 60_000);

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    bookingRef: 'REF0000001',
    showId: 4,
    status: BookingStatus.HOLDING,
    holdExpiresAt: past(),
    paymentExpiresAt: null as Date | null,
    ...overrides,
  };
}

function build(lockedRows: Record<number, ReturnType<typeof makeBooking> | null>) {
  const manager = {
    findOne: jest.fn(async (_entity: unknown, options: any) => {
      const row = lockedRows[options.where.id];
      if (row instanceof Error) throw row;
      return row;
    }),
    save: jest.fn(async (_entity: unknown, value: unknown) => value),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const bookingRepository = { find: jest.fn().mockResolvedValue([]) };
  const publisher = { publishExpired: jest.fn().mockResolvedValue(undefined) };
  const service = new HoldSweepService(
    bookingRepository as unknown as Repository<Booking>,
    fakeDataSource(manager),
    publisher as unknown as BookingEventsPublisher,
  );
  return { service, manager, bookingRepository, publisher };
}

describe('HoldSweepService', () => {
  it('queries overdue bookings per status in SQL, capped at the batch size', async () => {
    const { service, bookingRepository } = build({});

    await service.sweepExpiredReservations();

    const [holdingQuery, paymentQuery] = bookingRepository.find.mock.calls.map(
      (call) => call[0],
    );
    expect(holdingQuery.where.status).toBe(BookingStatus.HOLDING);
    expect(holdingQuery.where.holdExpiresAt).toBeInstanceOf(FindOperator);
    expect(holdingQuery.where.holdExpiresAt.type).toBe('lessThanOrEqual');
    expect(paymentQuery.where.status).toBe(BookingStatus.PAYMENT_PENDING);
    expect(paymentQuery.where.paymentExpiresAt.type).toBe('lessThanOrEqual');
    expect(holdingQuery.take).toBe(SWEEP_BATCH_SIZE);
    expect(paymentQuery.take).toBe(SWEEP_BATCH_SIZE);
  });

  it('expires an overdue HOLDING booking, expires its holds and publishes', async () => {
    const booking = makeBooking();
    const { service, manager, publisher } = build({ 1: booking });

    await service.expireBooking(1);

    expect(booking.status).toBe(BookingStatus.EXPIRED);
    expect(manager.update).toHaveBeenCalledWith(
      SeatHold,
      { bookingId: 1, status: SeatHoldStatus.ACTIVE },
      { status: SeatHoldStatus.EXPIRED },
    );
    expect(publisher.publishExpired).toHaveBeenCalledWith({
      bookingRef: 'REF0000001',
      showId: 4,
    });
  });

  it('expires an overdue PAYMENT_PENDING booking', async () => {
    const booking = makeBooking({
      status: BookingStatus.PAYMENT_PENDING,
      holdExpiresAt: past(),
      paymentExpiresAt: past(),
    });
    const { service } = build({ 1: booking });

    await service.expireBooking(1);

    expect(booking.status).toBe(BookingStatus.EXPIRED);
  });

  it.each([
    ['was confirmed after it was selected', makeBooking({ status: BookingStatus.CONFIRMED })],
    [
      'moved to PAYMENT_PENDING with a later deadline',
      makeBooking({ status: BookingStatus.PAYMENT_PENDING, paymentExpiresAt: future() }),
    ],
    ['no longer exists', null],
  ])('leaves a booking alone if it %s', async (_label, row) => {
    const { service, manager, publisher } = build({ 1: row });

    await service.expireBooking(1);

    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
    expect(publisher.publishExpired).not.toHaveBeenCalled();
  });

  it('carries on with the rest of the batch when one booking fails', async () => {
    const second = makeBooking({ id: 2, bookingRef: 'REF0000002' });
    const { service, bookingRepository, publisher } = build({
      1: new Error('deadlock victim') as any,
      2: second,
    });
    bookingRepository.find
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
      .mockResolvedValueOnce([]);

    await service.sweepExpiredReservations();

    expect(second.status).toBe(BookingStatus.EXPIRED);
    expect(publisher.publishExpired).toHaveBeenCalledTimes(1);
  });
});
