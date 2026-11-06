import { describe, expect, it } from "vitest";

import {
  assertWebhookPaymentMatch,
  safeEqualString,
} from "@/lib/payments/webhook-guards";

describe("assertWebhookPaymentMatch", () => {
  const expected = {
    orderId: "order-1",
    amount: 10_000n,
    currency: "AMD",
  };

  it("accepts matching first-seen events", () => {
    expect(
      assertWebhookPaymentMatch({
        expected,
        eventOrderId: "order-1",
        eventAmount: 10_000n,
        eventCurrency: "AMD",
        providerEventId: "evt-1",
        seenProviderEventIds: new Set(),
      }),
    ).toEqual({ ok: true });
  });

  it("rejects replay, amount, currency, and order mismatches", () => {
    expect(
      assertWebhookPaymentMatch({
        expected,
        eventOrderId: "order-1",
        eventAmount: 10_000n,
        eventCurrency: "AMD",
        providerEventId: "evt-1",
        seenProviderEventIds: new Set(["evt-1"]),
      }).ok,
    ).toBe(false);

    expect(
      assertWebhookPaymentMatch({
        expected,
        eventOrderId: "order-1",
        eventAmount: 9_999n,
        eventCurrency: "AMD",
        providerEventId: "evt-2",
        seenProviderEventIds: new Set(),
      }),
    ).toMatchObject({ reason: "AMOUNT_MISMATCH" });

    expect(
      assertWebhookPaymentMatch({
        expected,
        eventOrderId: "order-1",
        eventAmount: 10_000n,
        eventCurrency: "USD",
        providerEventId: "evt-3",
        seenProviderEventIds: new Set(),
      }),
    ).toMatchObject({ reason: "CURRENCY_MISMATCH" });

    expect(
      assertWebhookPaymentMatch({
        expected,
        eventOrderId: "order-2",
        eventAmount: 10_000n,
        eventCurrency: "AMD",
        providerEventId: "evt-4",
        seenProviderEventIds: new Set(),
      }),
    ).toMatchObject({ reason: "ORDER_MISMATCH" });
  });
});

describe("safeEqualString", () => {
  it("compares equal-length digests", () => {
    expect(safeEqualString("abcd", "abcd")).toBe(true);
    expect(safeEqualString("abcd", "abce")).toBe(false);
    expect(safeEqualString("abc", "abcd")).toBe(false);
  });
});
