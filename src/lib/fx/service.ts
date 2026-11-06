import "server-only";

import { getProviders } from "@/config/providers";
import { resolveExchangeQuote } from "@/lib/fx/resolve-quote";
import type { ExchangeRateQuote } from "@/lib/fx/types";
import type { Currency } from "@/lib/money/currency";
import { defaultCurrency } from "@/lib/money/currency";
import { logger } from "@/lib/observability/logger";

/**
 * Resolves an exchange quote with Redis cache and last-good stale fallback.
 * Identity pairs never hit the provider.
 */
export async function getExchangeQuote(
  base: Currency,
  quote: Currency,
): Promise<ExchangeRateQuote> {
  const providers = getProviders();

  try {
    return await resolveExchangeQuote(base, quote, {
      redis: providers.redis.getClient(),
      adapter: providers.exchangeRates,
      onStaleFallback: (details) => {
        logger.warn("fx.stale_fallback", details);
      },
    });
  } catch (error) {
    logger.error("fx.quote_failed", {
      base,
      quote,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}

/** Snapshot helper for checkout: base AMD → selected display currency. */
export async function getCheckoutRateSnapshot(
  displayCurrency: Currency,
): Promise<ExchangeRateQuote> {
  return getExchangeQuote(defaultCurrency, displayCurrency);
}
