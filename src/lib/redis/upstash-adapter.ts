import 'server-only';
import { Redis } from '@upstash/redis';
import type { RedisAdapter, RedisClient } from '@/lib/redis/types';
export function createUpstashRedisAdapter(input: { url: string; token: string }): RedisAdapter {
  // The application-level Redis contract is string-only. Disable Upstash's
  // implicit JSON parsing so GET/GETDEL behave identically to real Redis and
  // the in-memory adapter for purpose-bound token records.
  const redis = new Redis({
    url: input.url,
    token: input.token,
    automaticDeserialization: false,
  });
  const client: RedisClient = {
    get: async (key) => redis.get<string>(key),
    set: async (key, value, options) => {
      if (options?.ex && options.nx) {
        return redis.set(key, value, { ex: options.ex, nx: true }) as Promise<'OK' | null>;
      }
      if (options?.ex) {
        return redis.set(key, value, { ex: options.ex }) as Promise<'OK' | null>;
      }
      if (options?.nx) {
        return redis.set(key, value, { nx: true }) as Promise<'OK' | null>;
      }
      return redis.set(key, value) as Promise<'OK' | null>;
    },
    del: async (key) => redis.del(key),
    getdel: async (key) => redis.getdel<string>(key),
  };
  return { name: 'upstash', getClient: () => client };
}
