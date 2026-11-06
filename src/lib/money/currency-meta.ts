import type { Currency } from "@/lib/money/currency";

/** Integer minor-unit scale and display fraction digits per currency. */
export type CurrencyMeta = {
  /** Powers of 10 between major and stored integer units. AMD=0 (dram). */
  scale: number;
  fractionDigits: number;
};

export const currencyMeta: Record<Currency, CurrencyMeta> = {
  AMD: { scale: 0, fractionDigits: 0 },
  USD: { scale: 2, fractionDigits: 2 },
  RUB: { scale: 2, fractionDigits: 2 },
};

export function getCurrencyMeta(currency: Currency): CurrencyMeta {
  return currencyMeta[currency];
}
