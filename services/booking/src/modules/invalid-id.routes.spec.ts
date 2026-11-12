import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpExceptionFilter, JwtAuthGuard } from '@moviebooking/common';
import { AvailabilityController } from './availability/availability.controller';
import { AvailabilityService } from './availability/availability.service';
import { AdminBookingsController } from './bookings/admin-bookings.controller';
import { AdminBookingQueryService } from './bookings/admin-booking-query.service';

/** Invalid encrypted IDs must return 400 before reaching a service. */
describe('Booking routes with an invalid encrypted ID', () => {
  let app: INestApplication;
  let baseUrl: string;
  const availabilityService = { getAvailability: jest.fn() };
  const adminBookingQueryService = {
    getBookingDetail: jest.fn(),
    listBookings: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AvailabilityController, AdminBookingsController],
      providers: [
        { provide: AvailabilityService, useValue: availabilityService },
        {
          provide: AdminBookingQueryService,
          useValue: adminBookingQueryService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = {
            id: 1,
            role: { id: 1, code: 'SUPER_ADMIN', name: 'Super Admin' },
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0);
    baseUrl = (await app.getUrl()).replace('[::1]', 'localhost');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('GET /shows/:showId/seats/availability returns 400', async () => {
    const res = await fetch(`${baseUrl}/shows/not-an-id/seats/availability`);
    expect(res.status).toBe(400);
    expect(availabilityService.getAvailability).not.toHaveBeenCalled();
  });

  it('GET /bookings/:id/admin returns 400', async () => {
    const res = await fetch(`${baseUrl}/bookings/not-an-id/admin`);
    expect(res.status).toBe(400);
    expect(adminBookingQueryService.getBookingDetail).not.toHaveBeenCalled();
  });

  it('passes valid IDs through as numbers', async () => {
    availabilityService.getAvailability.mockResolvedValue({});
    adminBookingQueryService.getBookingDetail.mockResolvedValue({});

    await fetch(`${baseUrl}/shows/3/seats/availability`);
    await fetch(`${baseUrl}/bookings/8/admin`);

    expect(availabilityService.getAvailability).toHaveBeenCalledWith(3);
    expect(adminBookingQueryService.getBookingDetail).toHaveBeenCalledWith(
      8,
      expect.objectContaining({ id: 1 }),
    );
  });
});
