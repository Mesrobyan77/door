import { describe, expect, it } from "vitest";

import {
  canTransitionPaymentStatus,
  getEligiblePaymentStatuses,
} from "@/features/orders/domain/payment-status";

describe("payment status transitions", () => {
  it("allows admin list moves among Paid / pending / Failed", () => {
    expect(canTransitionPaymentStatus("PENDING", "CAPTURED")).toBe(true);
    expect(canTransitionPaymentStatus("CAPTURED", "PENDING")).toBe(true);
    expect(canTransitionPaymentStatus("CAPTURED", "FAILED")).toBe(true);
    expect(canTransitionPaymentStatus("FAILED", "CAPTURED")).toBe(true);
  });

  it("allows refund after capture", () => {
    expect(canTransitionPaymentStatus("CAPTURED", "REFUNDED")).toBe(true);
  });

  it("allows retry from failed back to pending", () => {
    expect(canTransitionPaymentStatus("FAILED", "PENDING")).toBe(true);
    expect(getEligiblePaymentStatuses("FAILED")).toEqual([
      "PENDING",
      "CAPTURED",
      "CANCELLED",
    ]);
  });

  it("allows reopen from cancelled", () => {
    expect(getEligiblePaymentStatuses("CANCELLED")).toEqual([
      "PENDING",
      "FAILED",
    ]);
  });
});
