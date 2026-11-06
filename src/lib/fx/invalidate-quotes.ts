import type { Currency } from "@/lib/money/currency";
import type { RedisClient } from "@/lib/redis/types";

const AMD_QUOTE_CURRENCIES = ["USD", "RUB"] as const satisfies ReadonlyArray<
  Exclude<Currency, "AMD">
>;

function freshKey(base: Currency, quote: Currency): string {
  return `fx:quote:${base}:${quote}`;
}

function staleKey(base: Currency, quote: Currency): string {
  return `fx:stale:${base}:${quote}`;
}

/** Drops cached AMD→quote snapshots so the next request loads fresh admin rates. */
export async function invalidateAmdFxQuotes(
  redis: RedisClient,
): Promise<void> {
  await Promise.all(
    AMD_QUOTE_CURRENCIES.flatMap((quote) => [
      redis.del(freshKey("AMD", quote)),
      redis.del(staleKey("AMD", quote)),
    ]),
  );
}
