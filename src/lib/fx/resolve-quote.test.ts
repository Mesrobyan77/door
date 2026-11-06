import { describe, expect, it, vi } from "vitest";

import { resolveExchangeQuote } from "@/lib/fx/resolve-quote";
import type { ExchangeRateAdapter } from "@/lib/fx/types";
import { createMemoryRedisAdapter } from "@/lib/redis/memory-adapter";

function createCountingFx(
  rate: string,
  failAfter = Number.POSITIVE_INFINITY,
): ExchangeRateAdapter & { calls: number } {
  const adapter = {
    name: "counting",
    calls: 0,
    async getRate(base: "AMD" | "USD" | "RUB", quote: "AMD" | "USD" | "RUB") {
      adapter.calls += 1;
      if (adapter.calls > failAfter) {
        throw new Error("provider down");
      }
      return {
        base,
        quote,
        rate,
        asOf: new Date("2026-07-18T10:00:00.000Z"),
        source: "test",
      };
    },
  };
  return adapter;
}

describe("resolveExchangeQuote", () => {
  it("returns identity without provider calls", async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const adapter = createCountingFx("0.0026");

    await expect(
      resolveExchangeQuote("AMD", "AMD", { redis, adapter }),
    ).resolves.toMatchObject({ rate: "1", source: "identity" });
    expect(adapter.calls).toBe(0);
  });

  it("caches live quote and serves from cache", async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const adapter = createCountingFx("0.0026");

    const first = await resolveExchangeQuote("AMD", "USD", { redis, adapter });
    const second = await resolveExchangeQuote("AMD", "USD", { redis, adapter });

    expect(first.rate).toBe("0.0026");
    expect(second.rate).toBe("0.0026");
    expect(adapter.calls).toBe(1);
  });

  it("falls back to stale quote when provider fails", async () => {
    const redis = createMemoryRedisAdapter().getClient();
    const adapter = createCountingFx("0.0026", 1);
    const onStaleFallback = vi.fn();

    await resolveExchangeQuote("AMD", "USD", { redis, adapter });
    await redis.del("fx:quote:AMD:USD");

    const stale = await resolveExchangeQuote("AMD", "USD", {
      redis,
      adapter,
      now: new Date("2026-07-18T12:00:00.000Z"),
      onStaleFallback,
    });

    expect(stale.rate).toBe("0.0026");
    expect(stale.source).toBe("test:stale");
    expect(onStaleFallback).toHaveBeenCalledOnce();
  });
});
