import type { Currency } from "@/lib/money/currency";

export type ExchangeRateQuote = {
  base: Currency;
  quote: Currency;
  /** How many quote units for 1 base unit, decimal string for precision. */
  rate: string;
  asOf: Date;
  source: string;
};

export type ExchangeRateAdapter = {
  readonly name: string;
  getRate(base: Currency, quote: Currency): Promise<ExchangeRateQuote>;
};
