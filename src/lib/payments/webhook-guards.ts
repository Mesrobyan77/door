/**
 * Shared webhook reconciliation guards for online payment adapters (OPEN-002).
 * COD does not use webhooks; these helpers exist for future approved providers.
 */

export type ExpectedPayment = {
  orderId: string;
  amount: bigint;
  currency: string;
};

export type WebhookGuardInput = {
  expected: ExpectedPayment;
  eventOrderId: string;
  eventAmount: bigint;
  eventCurrency: string;
  providerEventId: string;
  /** Previously persisted provider event IDs for this order/provider. */
  seenProviderEventIds: ReadonlySet<string>;
};

export type WebhookGuardFailure =
  | "REPLAY"
  | "AMOUNT_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "ORDER_MISMATCH";

export type WebhookGuardResult =
  | { ok: true }
  | { ok: false; reason: WebhookGuardFailure };

/** Validates order/amount/currency match and rejects replayed provider events. */
export function assertWebhookPaymentMatch(
  input: WebhookGuardInput,
): WebhookGuardResult {
  if (input.seenProviderEventIds.has(input.providerEventId)) {
    return { ok: false, reason: "REPLAY" };
  }

  if (input.eventOrderId !== input.expected.orderId) {
    return { ok: false, reason: "ORDER_MISMATCH" };
  }

  if (input.eventCurrency.toUpperCase() !== input.expected.currency.toUpperCase()) {
    return { ok: false, reason: "CURRENCY_MISMATCH" };
  }

  if (input.eventAmount !== input.expected.amount) {
    return { ok: false, reason: "AMOUNT_MISMATCH" };
  }

  return { ok: true };
}

/**
 * Constant-time-ish signature compare for hex/base64 digests.
 * Not a substitute for HMAC verification — call after computing expected digest.
 */
export function safeEqualString(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}
