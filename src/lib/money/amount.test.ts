import { describe, expect, it } from "vitest";

import { addMoney, money, subtractMoney } from "@/lib/money/amount";

describe("money amounts", () => {
  it("adds same-currency amounts", () => {
    expect(addMoney(money(1000, "AMD"), money(250, "AMD"))).toEqual(
      money(1250n, "AMD"),
    );
  });

  it("rejects cross-currency arithmetic", () => {
    expect(() => addMoney(money(100, "AMD"), money(1, "USD"))).toThrow(
      /different currencies/,
    );
  });

  it("rejects negative subtraction", () => {
    expect(() => subtractMoney(money(10, "AMD"), money(20, "AMD"))).toThrow(
      /negative/,
    );
  });
});
