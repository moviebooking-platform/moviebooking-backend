import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Booking, BookingSeat } from '@moviebooking/database';
import { HoldService } from './hold.service';
import { ShowClient } from '../../clients/show.client';
import { TheatreClient } from '../../clients/theatre.client';
import {
  SeatLockContendedError,
  SeatLockService,
} from '../../redis/seat-lock.service';
import { BookingRefGenerator } from './booking-ref.generator';
import {
  defaultsOnlyConfig,
  expectAppError,
  fakeDataSource,
} from '../../testing/test-helpers';

// ID encryption is not initialised in these tests, so plain integers are valid IDs.
const SHOW = { id: 1, screenId: 5, movieId: 2, status: 'ACTIVE' };
const SEATS = [
  {
    id: 10,
    screenId: 5,
    seatCode: 'A1',
    rowLabel: 'A',
    seatNumber: 1,
    seatType: 'STANDARD',
    status: 'ACTIVE',
  },
  {
    id: 11,
    screenId: 5,
    seatCode: 'A2',
    rowLabel: 'A',
    seatNumber: 2,
    seatType: 'VIP',
    status: 'ACTIVE',
  },
];
const PRICES = [
  { id: 1, showId: 1, seatType: 'STANDARD', amount: 1000, currency: 'GBP' },
  { id: 2, showId: 1, seatType: 'VIP', amount: 1500, currency: 'GBP' },
];
const DTO = { showId: '1', seatIds: ['10', '11'], email: 'guest@example.com' };

interface ManagerOptions {
  soldSeatIds?: number[];
  heldSeatIds?: number[];
  holdSaveError?: unknown;
}

/** Minimal EntityManager covering what the hold transaction uses. */
function fakeManager(options: ManagerOptions = {}) {
  const queryBuilder = (seatIds: number[]) => {
    const qb: Record<string, jest.Mock> = {};
    for (const method of ['innerJoin', 'where', 'andWhere', 'select']) {
      qb[method] = jest.fn(() => qb);
    }
    qb.getRawMany = jest
      .fn()
      .mockResolvedValue(seatIds.map((seatId) => ({ seatId })));
    return qb;
  };

  return {
    createQueryBuilder: jest.fn((entity: unknown) =>
      queryBuilder(
        entity === BookingSeat
          ? (options.soldSeatIds ?? [])
          : (options.heldSeatIds ?? []),
      ),
    ),
    create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
    save: jest.fn(async (entity: any) => {
      const isHoldBatch = Array.isArray(entity) && 'expiresAt' in entity[0];
      if (isHoldBatch && options.holdSaveError) throw options.holdSaveError;
      if (!Array.isArray(entity)) entity.id = 99;
      return entity;
    }),
  };
}

function buildService(managerOptions: ManagerOptions = {}) {
  const manager = fakeManager(managerOptions);
  const dataSource = fakeDataSource(manager);
  const showClient = {
    getShow: jest.fn().mockResolvedValue(SHOW),
    getPrices: jest.fn().mockResolvedValue(PRICES),
  };
  const theatreClient = {
    getScreenSeats: jest.fn().mockResolvedValue(SEATS),
  };
  const seatLockService = {
    acquire: jest.fn(async (showId: number, seatId: number) => ({
      key: `lock:seat:${showId}:${seatId}`,
      nonce: 'n',
      locked: true,
    })),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const bookingRefGenerator = {
    generateUniqueRef: jest.fn().mockResolvedValue('ABCDEFGHJK'),
  };
  const bookingRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 99, bookingRef: 'ABCDEFGHJK' }),
  };

  const service = new HoldService(
    dataSource,
    bookingRepo as unknown as Repository<Booking>,
    defaultsOnlyConfig as unknown as ConfigService,
    showClient as unknown as ShowClient,
    theatreClient as unknown as TheatreClient,
    seatLockService as unknown as SeatLockService,
    bookingRefGenerator as unknown as BookingRefGenerator,
  );

  return {
    service,
    manager,
    dataSource,
    showClient,
    theatreClient,
    seatLockService,
  };
}

describe('HoldService', () => {
  describe('validation errors (before any lock or transaction)', () => {
    it('returns 400 for an invalid show ID', async () => {
      const { service, seatLockService } = buildService();
      await expectAppError(
        service.holdSeats({ ...DTO, showId: 'not-an-id' }),
        400,
      );
      expect(seatLockService.acquire).not.toHaveBeenCalled();
    });

    it('returns 400 when two seat IDs decrypt to the same seat', async () => {
      const { service } = buildService();
      await expectAppError(
        service.holdSeats({ ...DTO, seatIds: ['10', '010'] }),
        400,
      );
    });

    it('returns 404 when the show does not exist', async () => {
      const { service, showClient } = buildService();
      showClient.getShow.mockResolvedValue(null);
      await expectAppError(service.holdSeats(DTO), 404);
    });

    it('returns 422 when the show is not active', async () => {
      const { service, showClient } = buildService();
      showClient.getShow.mockResolvedValue({ ...SHOW, status: 'INACTIVE' });
      await expectAppError(service.holdSeats(DTO), 422);
    });

    it("returns 422 when a seat is not on the show's screen", async () => {
      const { service } = buildService();
      await expectAppError(
        service.holdSeats({ ...DTO, seatIds: ['10', '999'] }),
        422,
      );
    });

    it('returns 422 when a seat type has no price', async () => {
      const { service, showClient } = buildService();
      showClient.getPrices.mockResolvedValue([PRICES[0]]);
      await expectAppError(service.holdSeats(DTO), 422);
    });
  });

  describe('errors inside the hold transaction', () => {
    it('returns 422 (not 500) when a seat is already sold, and releases the locks', async () => {
      const { service, seatLockService } = buildService({ soldSeatIds: [10] });
      const error = await expectAppError(service.holdSeats(DTO), 422);
      expect(error.message).toContain('already sold');
      expect(seatLockService.release).toHaveBeenCalledTimes(2);
    });

    it('returns 422 (not 500) when a seat is currently held', async () => {
      const { service } = buildService({ heldSeatIds: [11] });
      const error = await expectAppError(service.holdSeats(DTO), 422);
      expect(error.message).toContain('currently held');
    });

    it('returns 422 when the filtered unique index rejects a duplicate hold', async () => {
      const duplicateKey = Object.assign(new Error('duplicate key'), {
        name: 'QueryFailedError',
        number: 2601,
      });
      const { service } = buildService({ holdSaveError: duplicateKey });
      const error = await expectAppError(service.holdSeats(DTO), 422);
      expect(error.message).toContain('already held');
    });

    it('rethrows unexpected database errors unchanged', async () => {
      const dbDown = Object.assign(new Error('connection lost'), {
        code: 'ECONNCLOSED',
      });
      const { service } = buildService({ holdSaveError: dbDown });
      await expect(service.holdSeats(DTO)).rejects.toBe(dbDown);
    });
  });

  it('returns 422 when another request holds the seat lock', async () => {
    const { service, seatLockService } = buildService();
    seatLockService.acquire.mockRejectedValueOnce(
      new SeatLockContendedError(1, 10),
    );
    await expectAppError(service.holdSeats(DTO), 422);
  });

  it('creates the booking in one transaction and releases every lock', async () => {
    const { service, dataSource, manager, seatLockService } = buildService();

    const booking = await service.holdSeats(DTO);

    expect(booking.bookingRef).toBe('ABCDEFGHJK');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    // booking, booking_seats batch, seat_holds batch
    expect(manager.save).toHaveBeenCalledTimes(3);
    const bookingSeats = manager.save.mock.calls[1][0];
    expect(bookingSeats.map((s: any) => [s.seatCode, s.priceCents])).toEqual([
      ['A1', 1000],
      ['A2', 1500],
    ]);
    expect(seatLockService.acquire.mock.calls.map((c) => c[1])).toEqual([
      10, 11,
    ]);
    expect(seatLockService.release).toHaveBeenCalledTimes(2);
  });
});
