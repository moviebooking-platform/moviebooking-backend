import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpExceptionFilter, JwtAuthGuard } from '@moviebooking/common';
import { Show } from '../../entities';
import { TheatreClient } from '../../clients/theatre.client';
import { ShowsController } from './shows.controller';
import { ShowsService } from './shows.service';
import { ShowPricesController } from '../show-prices/show-prices.controller';
import { ShowPricesService } from '../show-prices/show-prices.service';
import { SeatAvailabilityController } from '../seat-availability/seat-availability.controller';
import { SeatAvailabilityService } from '../seat-availability/seat-availability.service';

/**
 * An ID that fails to decrypt must be rejected with 400 before any lookup. Previously
 * it reached findOne({ where: { id: null } }); TypeORM ignores null in `where`, so the
 * query matched an arbitrary show.
 */
describe('Show routes with an invalid encrypted ID', () => {
  let app: INestApplication;
  let baseUrl: string;
  let currentUser: object | null = null;

  const showsService = {
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const showPricesService = { getPrices: jest.fn(), setPrices: jest.fn() };
  const seatAvailabilityService = { getAvailability: jest.fn() };
  const showRepository = { findOne: jest.fn() };

  const superAdmin = {
    id: 1,
    role: { id: 1, code: 'SUPER_ADMIN', name: 'Super Admin' },
  };
  const theatreAdmin = {
    id: 2,
    role: { id: 3, code: 'THEATRE_ADMIN', name: 'Theatre Admin' },
    theatreId: 4,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        ShowsController,
        ShowPricesController,
        SeatAvailabilityController,
      ],
      providers: [
        { provide: ShowsService, useValue: showsService },
        { provide: ShowPricesService, useValue: showPricesService },
        { provide: SeatAvailabilityService, useValue: seatAvailabilityService },
        { provide: getRepositoryToken(Show), useValue: showRepository },
        { provide: TheatreClient, useValue: { getScreen: jest.fn() } },
      ],
    })
      // Stand in for JWT verification; the real RolesGuard and ShowOwnershipGuard run.
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = currentUser;
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

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = null;
  });

  async function call(method: string, path: string) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify({}),
    });
    const body = (await res.json()) as { error?: { code: string } };
    return { status: res.status, code: body.error?.code };
  }

  it.each([
    ['GET', '/shows/not-an-id'],
    ['GET', '/shows/not-an-id/prices'],
    ['GET', '/shows/not-an-id/seats'],
  ])('%s %s returns 400 for a guest', async (method, path) => {
    expect(await call(method, path)).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
    expect(showsService.findOne).not.toHaveBeenCalled();
    expect(showPricesService.getPrices).not.toHaveBeenCalled();
    expect(seatAvailabilityService.getAvailability).not.toHaveBeenCalled();
  });

  it.each([
    ['PATCH', '/shows/not-an-id'],
    ['DELETE', '/shows/not-an-id'],
    ['PUT', '/shows/not-an-id/prices'],
  ])(
    '%s %s returns 400 for a super admin without touching any show',
    async (method, path) => {
      currentUser = superAdmin;
      expect(await call(method, path)).toEqual({
        status: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(showsService.update).not.toHaveBeenCalled();
      expect(showsService.delete).not.toHaveBeenCalled();
      expect(showPricesService.setPrices).not.toHaveBeenCalled();
    },
  );

  it('ShowOwnershipGuard returns 400 for a theatre admin before querying shows', async () => {
    currentUser = theatreAdmin;
    expect(await call('PATCH', '/shows/not-an-id')).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
    expect(showRepository.findOne).not.toHaveBeenCalled();
  });

  it('passes a valid ID through as a number', async () => {
    showsService.findOne.mockResolvedValue({ id: 'x' });
    const res = await fetch(`${baseUrl}/shows/12`);
    expect(res.status).toBe(200);
    expect(showsService.findOne).toHaveBeenCalledWith(12, undefined);
  });
});
