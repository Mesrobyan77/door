import { describe, expect, it } from "vitest";

import {
  computeDiscountAmount,
  normalizePromotionCode,
  validatePromotionRules,
} from "@/features/promotions/domain/promotion-rules";

describe("promotion rules", () => {
  it("normalizes coupon codes", () => {
    expect(normalizePromotionCode("  welcome 10 ")).toBe("WELCOME10");
  });

  it("accepts a valid order-level coupon", () => {
    expect(
      validatePromotionRules({
        kind: "COUPON",
        code: "SAVE10",
        discountType: "PERCENTAGE",
        discountValue: 10,
        maxDiscountAmount: 5000,
      }),
    ).toBeNull();
  });

  it("requires a target for automatic discounts", () => {
    expect(
      validatePromotionRules({
        kind: "AUTOMATIC",
        discountType: "FIXED",
        discountValue: 1000,
      }),
    ).toBe("TARGET_REQUIRED");
  });

  it("rejects coupon with product target", () => {
    expect(
      validatePromotionRules({
        kind: "COUPON",
        code: "X",
        productId: "01900000-0000-7000-8000-000000000020",
        discountType: "PERCENTAGE",
        discountValue: 10,
      }),
    ).toBe("TARGET_FORBIDDEN");
  });

  it("computes percentage and fixed discounts without exceeding subtotal", () => {
    expect(computeDiscountAmount(10_000, "PERCENTAGE", 10)).toBe(1_000);
    expect(computeDiscountAmount(10_000, "PERCENTAGE", 10, 500)).toBe(500);
    expect(computeDiscountAmount(1_000, "FIXED", 5_000)).toBe(1_000);
  });

  it("rejects invalid percentage and date range", () => {
    expect(
      validatePromotionRules({
        kind: "COUPON",
        code: "X",
        discountType: "PERCENTAGE",
        discountValue: 150,
      }),
    ).toBe("INVALID_PERCENTAGE");

    expect(
      validatePromotionRules({
        kind: "COUPON",
        code: "X",
        discountType: "FIXED",
        discountValue: 100,
        startsAt: new Date("2026-07-20T00:00:00Z"),
        endsAt: new Date("2026-07-10T00:00:00Z"),
      }),
    ).toBe("INVALID_DATE_RANGE");
  });
});
