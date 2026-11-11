import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpExceptionFilter } from '@moviebooking/common';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';

/**
 * Route-level tests: these start a real HTTP server, because the bug being guarded
 * against (a static route shadowed by a parameterised one) only shows up in routing.
 */
describe('InternalController routes', () => {
  let app: INestApplication;
  let baseUrl: string;
  const internalService = {
    getShowIdsByScreens: jest.fn().mockResolvedValue([101, 102]),
    getShowById: jest.fn().mockResolvedValue({ id: 5 }),
    getPricesByShowId: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [InternalController],
      providers: [{ provide: InternalService, useValue: internalService }],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0);
    baseUrl = (await app.getUrl()).replace('[::1]', 'localhost');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('resolves GET /internal/shows/by-screens to the by-screens handler', async () => {
    const res = await fetch(`${baseUrl}/internal/shows/by-screens?screenIds=3,1,3`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([101, 102]);
    expect(internalService.getShowIdsByScreens).toHaveBeenCalledWith([3, 1]);
    expect(internalService.getShowById).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', ''],
    ['empty', '?screenIds='],
    ['non-numeric', '?screenIds=1,abc'],
    ['zero', '?screenIds=0'],
    ['negative', '?screenIds=-4'],
    ['decimal', '?screenIds=1.5'],
  ])('returns 400 for %s screenIds', async (_label, query) => {
    const res = await fetch(`${baseUrl}/internal/shows/by-screens${query}`);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(internalService.getShowIdsByScreens).not.toHaveBeenCalled();
  });

  it('still resolves GET /internal/shows/:id', async () => {
    const res = await fetch(`${baseUrl}/internal/shows/5`);

    expect(res.status).toBe(200);
    expect(internalService.getShowById).toHaveBeenCalledWith(5);
  });
});
