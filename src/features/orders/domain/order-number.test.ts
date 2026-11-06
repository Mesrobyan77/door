import { describe, expect, it } from "vitest";

import {
  ORDER_NUMBER_START,
  formatOrderNumber,
  nextOrderSequence,
  parseOrderSequence,
} from "@/features/orders/domain/order-number";

describe("order number sequence", () => {
  it("formats sequential public codes", () => {
    expect(formatOrderNumber(100)).toBe("p100");
    expect(formatOrderNumber(101)).toBe("p101");
  });

  it("parses p-prefixed sequences only", () => {
    expect(parseOrderSequence("p100")).toBe(100);
    expect(parseOrderSequence("p101")).toBe(101);
    expect(parseOrderSequence("WS-MRRXI451-6D052C")).toBeNull();
    expect(parseOrderSequence("P100")).toBeNull();
  });

  it("starts at p100 when no sequential orders exist", () => {
    expect(nextOrderSequence(null)).toBe(ORDER_NUMBER_START);
  });

  it("increments from the current max", () => {
    expect(nextOrderSequence(100)).toBe(101);
    expect(nextOrderSequence(250)).toBe(251);
  });

  it("never goes below the start floor", () => {
    expect(nextOrderSequence(50)).toBe(ORDER_NUMBER_START);
  });
});
