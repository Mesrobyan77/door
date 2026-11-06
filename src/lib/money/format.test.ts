import { describe, expect, it } from "vitest";

import { formatMoneyAmount } from "@/lib/money/format";

describe("formatMoneyAmount", () => {
  it("formats AMD without fraction digits and with a stable currency code", () => {
    expect(formatMoneyAmount(12_500, "AMD", "hy")).toBe("12\u202f500 AMD");
    expect(formatMoneyAmount(12_500, "AMD", "en")).toBe("12\u202f500 AMD");
  });

  it("formats USD from minor units", () => {
    expect(formatMoneyAmount(2600n, "USD", "en")).toBe("26.00 USD");
  });

  it("is identical for the same amount across app locales (SSR-safe)", () => {
    const amount = 1_234;
    expect(formatMoneyAmount(amount, "AMD", "hy")).toBe(
      formatMoneyAmount(amount, "AMD", "en"),
    );
    expect(formatMoneyAmount(amount, "AMD", "hy")).toBe("1\u202f234 AMD");
  });
});
