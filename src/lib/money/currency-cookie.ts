import type { Currency } from "@/lib/money/currency";
import { defaultCurrency, isCurrency } from "@/lib/money/currency";

export const CURRENCY_COOKIE_NAME = "ws_currency";

export function parseCurrencyCookie(value: string | undefined): Currency {
  if (!value || !isCurrency(value)) {
    return defaultCurrency;
  }

  return value;
}
