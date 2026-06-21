import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

export interface BookingConfirmedEvent {
  bookingRef: string;
  showId: number;
  email: string;
  seats: { seatCode: string; seatType: string; priceCents: number }[];
  totalAmountCents: number;
  currency: string;
}

export interface BookingExpiredEvent {
  bookingRef: string;
  showId: number;
}

export interface BookingFailedEvent {
  bookingRef: string;
  showId: number;
}

/** Emits booking lifecycle events to the topic exchange consumed by Payment/Notification. */
@Injectable()
export class BookingEventsPublisher {
  // Must match the exchange the module declares, hence the same env key.
  private readonly exchange: string;

  constructor(
    private readonly amqp: AmqpConnection,
    config: ConfigService,
  ) {
    this.exchange = config.get<string>(
      'RABBITMQ_BOOKING_EXCHANGE',
      'booking.events',
    );
  }

  // IDs are raw ints across all three — these are internal events, never public payloads.
  async publishConfirmed(payload: BookingConfirmedEvent): Promise<void> {
    await this.amqp.publish(this.exchange, 'booking.confirmed', payload);
  }

  async publishExpired(payload: BookingExpiredEvent): Promise<void> {
    await this.amqp.publish(this.exchange, 'booking.expired', payload);
  }

  async publishFailed(payload: BookingFailedEvent): Promise<void> {
    await this.amqp.publish(this.exchange, 'booking.failed', payload);
  }
}
