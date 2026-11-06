import type { RedisAdapter, RedisClient } from "@/lib/redis/types";

type Entry = {
  value: string;
  expiresAt: number | null;
};

/** In-memory Redis stand-in for local/unit paths without Upstash. */
export function createMemoryRedisAdapter(): RedisAdapter {
  const store = new Map<string, Entry>();

  const client: RedisClient = {
    async get(key) {
      const entry = store.get(key);
      if (!entry) {
        return null;
      }

      if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
        store.delete(key);
        return null;
      }

      return entry.value;
    },
    async set(key, value, options) {
      if (options?.nx && store.has(key)) {
        const existing = store.get(key);
        if (
          existing &&
          (existing.expiresAt === null || Date.now() < existing.expiresAt)
        ) {
          return null;
        }
      }

      store.set(key, {
        value,
        expiresAt:
          typeof options?.ex === "number"
            ? Date.now() + options.ex * 1000
            : null,
      });

      return "OK";
    },
    async del(key) {
      return store.delete(key) ? 1 : 0;
    },
    async getdel(key) {
      const entry = store.get(key);
      if (!entry) {
        return null;
      }

      if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
        store.delete(key);
        return null;
      }

      store.delete(key);
      return entry.value;
    },
  };

  return {
    name: "memory",
    getClient: () => client,
  };
}
