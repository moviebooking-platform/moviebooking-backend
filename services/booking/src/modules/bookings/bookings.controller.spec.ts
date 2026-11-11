import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpExceptionFilter } from '@moviebooking/common';
import { BookingsController } from './bookings.controller';
import { HoldService } from './hold.service';
import { BookingQueryService } from './booking-query.service';
import { BookingCancelService } from './booking-cancel.service';

/** HTTP-level checks for the guest cancel route, with the same ValidationPipe as main.ts. */
describe('DELETE /bookings/:bookingRef', () => {
  let app: INestApplication;
  let baseUrl: string;
  const bookingCancelService = { cancelBooking: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        { provide: HoldService, useValue: {} },
        { provide: BookingQueryService, useValue: {} },
        { provide: BookingCancelService, useValue: bookingCancelService },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0);
    baseUrl = (await app.getUrl()).replace('[::1]', 'localhost');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const cancel = (body?: unknown) =>
    fetch(`${baseUrl}/bookings/REF0000003`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it.each([
    ['no body', undefined],
    ['no email', {}],
    ['an invalid email', { email: 'not-an-email' }],
  ])('returns 400 with %s', async (_label, body) => {
    const res = await cancel(body);
    expect(res.status).toBe(400);
    expect(bookingCancelService.cancelBooking).not.toHaveBeenCalled();
  });

  it('passes the reference and email to the cancel service', async () => {
    bookingCancelService.cancelBooking.mockResolvedValue({
      bookingRef: 'REF0000003',
      showId: 9,
      status: 'FAILED',
      seats: [{ seatId: 10, seatCode: 'A1', seatType: 'STANDARD', priceCents: 1000 }],
      totalAmountCents: 1000,
      currency: 'GBP',
      holdExpiresAt: null,
      paymentExpiresAt: null,
    });

    const res = await cancel({ email: 'guest@example.com' });

    expect(res.status).toBe(200);
    expect(bookingCancelService.cancelBooking).toHaveBeenCalledWith(
      'REF0000003',
      'guest@example.com',
    );
    const body = (await res.json()) as { seats: { seatCode: string }[] };
    expect(body.seats[0].seatCode).toBe('A1');
  });
});
