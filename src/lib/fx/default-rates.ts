import type { Currency } from "@/lib/money/currency";

/** Quote major units per 1 AMD (display conversion base). */
export type RatesFromAmd = Record<Exclude<Currency, "AMD">, string>;

/** Fallback until admin configures `store.fxRates`. */
export const DEFAULT_RATES_FROM_AMD: RatesFromAmd = {
  USD: "0.0026",
  RUB: "0.24",
};
