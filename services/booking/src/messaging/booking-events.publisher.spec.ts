import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BookingConfirmedEvent,
  BookingEventsPublisher,
  BookingExpiredEvent,
  BookingFailedEvent,
} from './booking-events.publisher';

const EXCHANGE = 'booking.events';

function buildPublisher(): {
  publisher: BookingEventsPublisher;
  publish: jest.Mock;
} {
  const publish = jest.fn().mockResolvedValue(undefined);
  const amqp = { publish } as unknown as AmqpConnection;
  const config = {
    get: (key: string, def?: string) =>
      key === 'RABBITMQ_BOOKING_EXCHANGE' ? EXCHANGE : def,
  } as unknown as ConfigService;

  return { publisher: new BookingEventsPublisher(amqp, config), publish };
}

describe('BookingEventsPublisher', () => {
  it('publishes booking.confirmed with the full payload to the topic exchange', async () => {
    const { publisher, publish } = buildPublisher();
    const payload: BookingConfirmedEvent = {
      bookingRef: 'BK-123',
      showId: 7,
      email: 'guest@example.com',
      seats: [{ seatCode: 'A1', seatType: 'STANDARD', priceCents: 1200 }],
      totalAmountCents: 1200,
      currency: 'GBP',
    };

    await publisher.publishConfirmed(payload);

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      EXCHANGE,
      'booking.confirmed',
      payload,
    );
  });

  it('publishes booking.expired with bookingRef and showId only', async () => {
    const { publisher, publish } = buildPublisher();
    const payload: BookingExpiredEvent = { bookingRef: 'BK-456', showId: 9 };

    await publisher.publishExpired(payload);

    expect(publish).toHaveBeenCalledWith(EXCHANGE, 'booking.expired', payload);
  });

  it('publishes booking.failed with bookingRef and showId only', async () => {
    const { publisher, publish } = buildPublisher();
    const payload: BookingFailedEvent = { bookingRef: 'BK-789', showId: 11 };

    await publisher.publishFailed(payload);

    expect(publish).toHaveBeenCalledWith(EXCHANGE, 'booking.failed', payload);
  });

  it('keeps showId as a raw integer in the payload (no encryption)', async () => {
    const { publisher, publish } = buildPublisher();

    await publisher.publishExpired({ bookingRef: 'BK-1', showId: 42 });

    const [, , sent] = publish.mock.calls[0];
    expect(sent.showId).toBe(42);
    expect(typeof sent.showId).toBe('number');
  });
});
