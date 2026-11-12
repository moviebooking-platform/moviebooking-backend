import { AppException } from '@moviebooking/common';
import { DataSource } from 'typeorm';

/**
 * DataSource stand-in whose transaction() behaves like TypeORM's from the caller's
 * point of view: it runs the callback with the given manager and rethrows whatever
 * the callback throws.
 */
export function fakeDataSource(manager: unknown): DataSource {
  return {
    transaction: jest.fn(async (work: (m: unknown) => Promise<unknown>) =>
      work(manager),
    ),
  } as unknown as DataSource;
}

/** Awaits a promise that must reject with an AppException and returns that exception. */
export async function expectAppError(
  promise: Promise<unknown>,
  status: number,
): Promise<AppException> {
  const error = await promise.then(
    () => {
      throw new Error('Expected the call to reject, but it resolved');
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).getStatus()).toBe(status);
  return error as AppException;
}

/** ConfigService stand-in that always returns the supplied default. */
export const defaultsOnlyConfig = {
  get: (_key: string, defaultValue?: unknown) => defaultValue,
};
