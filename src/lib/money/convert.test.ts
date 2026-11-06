import { describe, expect, it } from "vitest";

import {
  convertAmount,
  divRoundHalfUp,
  parseRateToFixed,
} from "@/lib/money/convert";

describe("exchange rate parsing", () => {
  it("parses decimal rates to fixed-point", () => {
    expect(parseRateToFixed("1")).toBe(100_000_000n);
    expect(parseRateToFixed("0.0026")).toBe(260_000n);
    expect(parseRateToFixed("0.24")).toBe(24_000_000n);
  });

  it("accepts European comma decimals", () => {
    expect(parseRateToFixed("0,2137")).toBe(21_370_000n);
    expect(parseRateToFixed("1,5")).toBe(150_000_000n);
  });

  it("rejects non-positive rates", () => {
    expect(() => parseRateToFixed("0")).toThrow(/positive/);
    expect(() => parseRateToFixed("-1")).toThrow(/Invalid/);
  });
});

describe("convertAmount", () => {
  it("keeps identity conversion", () => {
    expect(convertAmount(12_500, "1", "AMD", "AMD")).toEqual({
      amount: 12_500n,
      currency: "AMD",
    });
  });

  it("converts AMD to USD cents with half-up rounding", () => {
    // 10_000 AMD * 0.0026 = 26 USD → 2600 cents
    expect(convertAmount(10_000, "0.0026", "AMD", "USD")).toEqual({
      amount: 2600n,
      currency: "USD",
    });
  });

  it("converts AMD to RUB kopecks", () => {
    // 1_000 AMD * 0.24 = 240 RUB → 24000 kopecks
    expect(convertAmount(1_000, "0.24", "AMD", "RUB")).toEqual({
      amount: 24_000n,
      currency: "RUB",
    });
  });

  it("rounds half-up on fractional cents", () => {
    // 1 AMD * 0.0026 = 0.0026 USD → 0.26 cents → rounds to 0
    expect(convertAmount(1, "0.0026", "AMD", "USD").amount).toBe(0n);
    // 2 AMD * 0.0026 = 0.0052 USD → 0.52 cents → rounds to 1
    expect(convertAmount(2, "0.0026", "AMD", "USD").amount).toBe(1n);
  });
});

describe("divRoundHalfUp", () => {
  it("rounds .5 up", () => {
    expect(divRoundHalfUp(5n, 2n)).toBe(3n);
    expect(divRoundHalfUp(4n, 2n)).toBe(2n);
  });
});
