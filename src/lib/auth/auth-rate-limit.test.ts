import { describe, expect, it, vi } from 'vitest';
import { enforceAuthRateLimit } from '@/lib/auth/auth-rate-limit';
import { createMemoryRedisAdapter } from '@/lib/redis/memory-adapter';

describe('auth rate limits', () => {
  it('enforces the boundary atomically under concurrency', async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        enforceAuthRateLimit(redis, 'test', 'subject', {
          limit: 5,
          windowSeconds: 60,
          failOpen: false,
        }),
      ),
    );
    expect(results.filter((value) => value === 'allowed')).toHaveLength(5);
    expect(results.filter((value) => value === 'limited')).toHaveLength(15);
  });
  it('resets after the fixed window', async () => {
    vi.useFakeTimers();
    const redis = createMemoryRedisAdapter().getClient();
    const policy = { limit: 1, windowSeconds: 60, failOpen: false };
    await expect(enforceAuthRateLimit(redis, 'test', 'subject', policy)).resolves.toBe('allowed');
    await expect(enforceAuthRateLimit(redis, 'test', 'subject', policy)).resolves.toBe('limited');
    vi.advanceTimersByTime(60_001);
    await expect(enforceAuthRateLimit(redis, 'test', 'subject', policy)).resolves.toBe('allowed');
    vi.useRealTimers();
  });
  it('uses the declared Redis failure policy', async () => {
    const redis = {
      incrementWithExpiry: async () => {
        throw new Error('down');
      },
    } as never;
    await expect(
      enforceAuthRateLimit(redis, 'x', 'y', { limit: 1, windowSeconds: 1, failOpen: true }),
    ).resolves.toBe('allowed');
    await expect(
      enforceAuthRateLimit(redis, 'x', 'y', { limit: 1, windowSeconds: 1, failOpen: false }),
    ).resolves.toBe('unavailable');
  });
});
