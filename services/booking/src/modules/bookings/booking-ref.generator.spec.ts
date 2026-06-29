import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { AppException } from '@moviebooking/common';
import { BookingRefGenerator } from './booking-ref.generator';

const MAX_RETRIES = 3;

function buildGenerator(): BookingRefGenerator {
  const config = {
    get: (key: string, def?: string) =>
      key === 'BOOKING_REF_MAX_RETRIES' ? String(MAX_RETRIES) : def,
  } as unknown as ConfigService;

  return new BookingRefGenerator(config);
}

/** EntityManager stub whose count() returns the queued values in order. */
function fakeManager(countResults: number[]): EntityManager {
  const count = jest.fn();
  countResults.forEach((n) => count.mockResolvedValueOnce(n));
  return { count } as unknown as EntityManager;
}

describe('BookingRefGenerator', () => {
  it('returns the first ref when it is free (checks existence once)', async () => {
    const generator = buildGenerator();
    const manager = fakeManager([0]);

    const ref = await generator.generateUniqueRef(manager);

    expect(ref).toHaveLength(10);
    expect(manager.count).toHaveBeenCalledTimes(1);
  });

  it('retries past collisions and returns the first free ref', async () => {
    const generator = buildGenerator();
    // First two refs collide, third is free.
    const manager = fakeManager([1, 2, 0]);

    const ref = await generator.generateUniqueRef(manager);

    expect(ref).toBeTruthy();
    expect(manager.count).toHaveBeenCalledTimes(3);
  });

  it('throws INTERNAL_ERROR after exhausting all retries', async () => {
    const generator = buildGenerator();
    const manager = fakeManager([1, 1, 1]);

    await expect(generator.generateUniqueRef(manager)).rejects.toMatchObject({
      errorCode: 'INTERNAL_ERROR',
    });
    expect(manager.count).toHaveBeenCalledTimes(MAX_RETRIES);
  });

  it('raises the failure as an AppException', async () => {
    const generator = buildGenerator();
    const manager = fakeManager([1, 1, 1]);

    await expect(generator.generateUniqueRef(manager)).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('produces a non-empty ref of the expected length', async () => {
    const generator = buildGenerator();
    const manager = fakeManager([0]);

    const ref = await generator.generateUniqueRef(manager);

    expect(ref).toMatch(/^[0-9A-Z]{10}$/);
  });
});
