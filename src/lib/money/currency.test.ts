import { describe, expect, it } from "vitest";

import { parseCurrencyCookie } from "@/lib/money/currency-cookie";
import { defaultCurrency, isCurrency } from "@/lib/money/currency";

describe("currency", () => {
  it("accepts AMD, USD, RUB", () => {
    expect(isCurrency("AMD")).toBe(true);
    expect(isCurrency("EUR")).toBe(false);
  });

  it("falls back to AMD for invalid cookie values", () => {
    expect(parseCurrencyCookie(undefined)).toBe(defaultCurrency);
    expect(parseCurrencyCookie("EUR")).toBe("AMD");
    expect(parseCurrencyCookie("USD")).toBe("USD");
  });
});
