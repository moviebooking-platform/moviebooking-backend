import { ConfigService } from '@nestjs/config';
import {
  LockToken,
  SeatLockContendedError,
  SeatLockService,
} from './seat-lock.service';

/**
 * Minimal in-memory stand-in for the bits of ioredis the lock uses.
 * `set` honours NX semantics; `eval` mimics the owner-only compare-and-delete.
 */
class FakeRedis {
  store = new Map<string, string>();
  throwOnSet = false;

  set = jest.fn(
    async (
      key: string,
      value: string,
      _px: string,
      _ttl: number,
      _nx: string,
    ): Promise<string | null> => {
      if (this.throwOnSet) {
        throw new Error('ECONNREFUSED');
      }
      if (this.store.has(key)) {
        return null;
      }
      this.store.set(key, value);
      return 'OK';
    },
  );

  eval = jest.fn(
    async (
      _script: string,
      _numKeys: number,
      key: string,
      nonce: string,
    ): Promise<number> => {
      if (this.store.get(key) === nonce) {
        this.store.delete(key);
        return 1;
      }
      return 0;
    },
  );
}

function buildService(redis: FakeRedis, waitMs = 150): SeatLockService {
  const config = {
    get: (key: string, def?: string) => {
      const values: Record<string, string> = {
        SEAT_LOCK_TTL_SECONDS: '8',
        SEAT_LOCK_WAIT_MS: String(waitMs),
      };
      return values[key] ?? def;
    },
  } as unknown as ConfigService;

  return new SeatLockService(redis as unknown as never, config);
}

describe('SeatLockService', () => {
  it('acquires a usable lock when SET succeeds', async () => {
    const redis = new FakeRedis();
    const service = buildService(redis);

    const token = await service.acquire(1, 42);

    expect(token.locked).toBe(true);
    expect(token.key).toBe('lock:seat:1:42');
    expect(token.nonce).toBeTruthy();
    expect(redis.set).toHaveBeenCalledWith(
      'lock:seat:1:42',
      token.nonce,
      'PX',
      8000,
      'NX',
    );
  });

  it('throws SeatLockContendedError when the seat stays held past the bounded wait', async () => {
    const redis = new FakeRedis();
    // Pre-hold the key with another owner's nonce so every SET NX returns null.
    redis.store.set('lock:seat:1:42', 'someone-else');
    const service = buildService(redis, 120);

    await expect(service.acquire(1, 42)).rejects.toBeInstanceOf(
      SeatLockContendedError,
    );
    // Multiple attempts were made during the wait window.
    expect(redis.set.mock.calls.length).toBeGreaterThan(1);
  });

  it('releases a lock only when the nonce matches (owner-only)', async () => {
    const redis = new FakeRedis();
    const service = buildService(redis);

    const token = await service.acquire(1, 42);
    expect(redis.store.has('lock:seat:1:42')).toBe(true);

    // Wrong owner: key must remain.
    await service.release({ ...token, nonce: 'not-the-owner' });
    expect(redis.store.has('lock:seat:1:42')).toBe(true);

    // Correct owner: key is removed.
    await service.release(token);
    expect(redis.store.has('lock:seat:1:42')).toBe(false);
  });

  it('fails open: returns a not-locked token (no throw) when Redis is unreachable', async () => {
    const redis = new FakeRedis();
    redis.throwOnSet = true;
    const service = buildService(redis);

    const token = await service.acquire(1, 42);

    expect(token.locked).toBe(false);
    expect(token.key).toBe('lock:seat:1:42');
  });

  it('release is a no-op for a fail-open token', async () => {
    const redis = new FakeRedis();
    const service = buildService(redis);
    const failOpen: LockToken = {
      key: 'lock:seat:1:42',
      nonce: 'x',
      locked: false,
    };

    await service.release(failOpen);

    expect(redis.eval).not.toHaveBeenCalled();
  });
});
