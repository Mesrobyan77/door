import { DEFAULT_RATES_FROM_AMD, type RatesFromAmd } from "@/lib/fx/default-rates";
import type { ExchangeRateAdapter, ExchangeRateQuote } from "@/lib/fx/types";

export type StaticExchangeRateAdapterOptions = {
  /** Loads admin-maintained rates; defaults used when omitted. */
  getRatesFromAmd?: () => Promise<RatesFromAmd>;
};

/** Admin-maintained rates (store settings) with static defaults as fallback. */
export function createStaticExchangeRateAdapter(
  options: StaticExchangeRateAdapterOptions = {},
): ExchangeRateAdapter {
  const getRatesFromAmd =
    options.getRatesFromAmd ??
    (async (): Promise<RatesFromAmd> => DEFAULT_RATES_FROM_AMD);

  return {
    name: options.getRatesFromAmd ? "admin-store-rates" : "static-admin-rates",
    async getRate(base, quote): Promise<ExchangeRateQuote> {
      if (base === quote) {
        return {
          base,
          quote,
          rate: "1",
          asOf: new Date(),
          source: "identity",
        };
      }

      if (base === "AMD" && quote !== "AMD") {
        const rates = await getRatesFromAmd();
        return {
          base,
          quote,
          rate: rates[quote],
          asOf: new Date(),
          source: options.getRatesFromAmd ? "store.settings" : "static",
        };
      }

      throw new Error(`Unsupported FX pair: ${base}/${quote}`);
    },
  };
}
