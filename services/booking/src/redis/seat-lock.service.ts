import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

/** Identifies an acquired seat lock so only its owner can release it. */
export interface LockToken {
  key: string;
  nonce: string;
  /** False when Redis was unreachable and we proceeded without a real lock (fail-open). */
  locked: boolean;
}

/** Raised when a seat stays held by another request past the bounded wait. */
export class SeatLockContendedError extends Error {
  constructor(
    public readonly showId: number,
    public readonly seatId: number,
  ) {
    super(`Seat ${seatId} for show ${showId} is locked by another request`);
    this.name = 'SeatLockContendedError';
  }
}

// Owner-only release: delete the key only if it still holds our nonce.
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

@Injectable()
export class SeatLockService {
  private readonly logger = new Logger('SeatLockService');
  private readonly ttlMs: number;
  private readonly waitMs: number;
  private readonly retryIntervalMs = 50;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService,
  ) {
    this.ttlMs =
      parseInt(config.get<string>('SEAT_LOCK_TTL_SECONDS', '8'), 10) * 1000;
    this.waitMs = parseInt(config.get<string>('SEAT_LOCK_WAIT_MS', '500'), 10);
  }

  /**
   * Acquires a short-lived lock for one seat. Throws SeatLockContendedError if held by
   * someone else past the wait; returns a not-locked token if Redis itself is unreachable.
   */
  async acquire(showId: number, seatId: number): Promise<LockToken> {
    const key = `lock:seat:${showId}:${seatId}`;
    const nonce = randomUUID();
    const deadline = Date.now() + this.waitMs;

    for (;;) {
      try {
        const result = await this.redis.set(key, nonce, 'PX', this.ttlMs, 'NX');
        if (result === 'OK') {
          return { key, nonce, locked: true };
        }
      } catch (err) {
        // Redis is down — fail open and let the DB filtered unique index stay the real guard.
        this.logger.warn(
          `Redis unavailable acquiring ${key}; proceeding without lock: ${(err as Error).message}`,
        );
        return { key, nonce, locked: false };
      }

      // SET returned null: the seat is genuinely held by another request.
      if (Date.now() >= deadline) {
        throw new SeatLockContendedError(showId, seatId);
      }
      await this.sleep(this.retryIntervalMs);
    }
  }

  /** Releases a lock, deleting the key only if this token still owns it. No-op for fail-open tokens. */
  async release(token: LockToken): Promise<void> {
    if (!token.locked) return;
    try {
      await this.redis.eval(RELEASE_SCRIPT, 1, token.key, token.nonce);
    } catch (err) {
      this.logger.warn(
        `Failed to release ${token.key}: ${(err as Error).message}`,
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
