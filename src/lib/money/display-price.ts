import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getCheckoutRateSnapshot } from "@/lib/fx/service";
import { convertAmount } from "@/lib/money/convert";
import type { Currency } from "@/lib/money/currency";
import { defaultCurrency } from "@/lib/money/currency";
import {
  CURRENCY_COOKIE_NAME,
  parseCurrencyCookie,
} from "@/lib/money/currency-cookie";
import { formatMoneyAmount } from "@/lib/money/format";

export type DisplayPrice = {
  baseAmount: number;
  baseCurrency: Currency;
  displayAmount: bigint;
  displayCurrency: Currency;
  rate: string;
  rateSource: string;
  formatted: string;
};

/** Resolves selected display currency from the preference cookie. */
export const getSelectedCurrency = cache(async (): Promise<Currency> => {
  const store = await cookies();
  return parseCurrencyCookie(store.get(CURRENCY_COOKIE_NAME)?.value);
});

const getCachedRateSnapshot = cache(async (displayCurrency: Currency) => {
  return getCheckoutRateSnapshot(displayCurrency);
});

function toDisplayPrice(
  baseAmountAmd: number,
  currency: Currency,
  locale: string,
  rate: string,
  rateSource: string,
): DisplayPrice {
  const converted = convertAmount(
    baseAmountAmd,
    rate,
    defaultCurrency,
    currency,
  );

  return {
    baseAmount: baseAmountAmd,
    baseCurrency: defaultCurrency,
    displayAmount: converted.amount,
    displayCurrency: currency,
    rate,
    rateSource,
    formatted: formatMoneyAmount(converted.amount, currency, locale),
  };
}

/**
 * Converts a base-AMD catalog price into the shopper's display currency.
 * Rate lookup is request-deduped per currency via React.cache.
 */
export async function resolveDisplayPrice(
  baseAmountAmd: number,
  locale: string,
  displayCurrency?: Currency,
): Promise<DisplayPrice> {
  const currency = displayCurrency ?? (await getSelectedCurrency());
  const quote = await getCachedRateSnapshot(currency);
  return toDisplayPrice(
    baseAmountAmd,
    currency,
    locale,
    quote.rate,
    quote.source,
  );
}

/**
 * Builds a sync formatter that reuses one FX snapshot for an entire page.
 * Prefer this over mapping `resolveDisplayPrice` per product card.
 */
export async function createDisplayPriceFormatter(
  locale: string,
  displayCurrency?: Currency,
): Promise<(baseAmountAmd: number) => DisplayPrice> {
  const currency = displayCurrency ?? (await getSelectedCurrency());
  const quote = await getCachedRateSnapshot(currency);

  return (baseAmountAmd: number) =>
    toDisplayPrice(
      baseAmountAmd,
      currency,
      locale,
      quote.rate,
      quote.source,
    );
}
