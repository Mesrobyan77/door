import {
  FX_CACHE_TTL_SECONDS,
  FX_MAX_STALE_AGE_MS,
  FX_STALE_TTL_SECONDS,
} from "@/lib/fx/constants";
import type { ExchangeRateAdapter, ExchangeRateQuote } from "@/lib/fx/types";
import type { Currency } from "@/lib/money/currency";
import type { RedisClient } from "@/lib/redis/types";

type CachedQuote = {
  base: Currency;
  quote: Currency;
  rate: string;
  asOf: string;
  source: string;
};

export type ResolveQuoteDeps = {
  redis: RedisClient;
  adapter: ExchangeRateAdapter;
  now?: Date;
  onStaleFallback?: (details: {
    base: Currency;
    quote: Currency;
    source: string;
    asOf: string;
    error: string;
  }) => void;
};

function freshKey(base: Currency, quote: Currency): string {
  return `fx:quote:${base}:${quote}`;
}

function staleKey(base: Currency, quote: Currency): string {
  return `fx:stale:${base}:${quote}`;
}

function serializeQuote(quote: ExchangeRateQuote): string {
  const payload: CachedQuote = {
    base: quote.base,
    quote: quote.quote,
    rate: quote.rate,
    asOf: quote.asOf.toISOString(),
    source: quote.source,
  };
  return JSON.stringify(payload);
}

function deserializeQuote(raw: string): ExchangeRateQuote | null {
  try {
    const parsed = JSON.parse(raw) as CachedQuote;
    if (
      typeof parsed.rate !== "string" ||
      typeof parsed.asOf !== "string" ||
      typeof parsed.source !== "string"
    ) {
      return null;
    }

    return {
      base: parsed.base,
      quote: parsed.quote,
      rate: parsed.rate,
      asOf: new Date(parsed.asOf),
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

function isUsableStale(quote: ExchangeRateQuote, now: Date): boolean {
  return now.getTime() - quote.asOf.getTime() <= FX_MAX_STALE_AGE_MS;
}

/**
 * Resolves FX quote with Redis fresh cache and last-good stale fallback.
 * Pure of Next.js/provider wiring for unit testing.
 */
export async function resolveExchangeQuote(
  base: Currency,
  quote: Currency,
  deps: ResolveQuoteDeps,
): Promise<ExchangeRateQuote> {
  if (base === quote) {
    return {
      base,
      quote,
      rate: "1",
      asOf: deps.now ?? new Date(),
      source: "identity",
    };
  }

  const now = deps.now ?? new Date();
  const cached = await deps.redis.get(freshKey(base, quote));
  if (cached) {
    const parsed = deserializeQuote(cached);
    if (parsed) {
      return parsed;
    }
  }

  try {
    const live = await deps.adapter.getRate(base, quote);
    const serialized = serializeQuote(live);
    await deps.redis.set(freshKey(base, quote), serialized, {
      ex: FX_CACHE_TTL_SECONDS,
    });
    await deps.redis.set(staleKey(base, quote), serialized, {
      ex: FX_STALE_TTL_SECONDS,
    });
    return live;
  } catch (error) {
    const staleRaw = await deps.redis.get(staleKey(base, quote));
    const stale = staleRaw ? deserializeQuote(staleRaw) : null;
    if (stale && isUsableStale(stale, now)) {
      deps.onStaleFallback?.({
        base,
        quote,
        source: stale.source,
        asOf: stale.asOf.toISOString(),
        error: error instanceof Error ? error.message : "unknown",
      });
      return {
        ...stale,
        source: `${stale.source}:stale`,
      };
    }

    throw error;
  }
}
