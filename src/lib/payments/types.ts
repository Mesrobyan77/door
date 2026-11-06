export type PaymentIntent = {
  orderId: string;
  amount: bigint;
  currency: string;
  idempotencyKey: string;
};

export type PaymentResult = {
  provider: string;
  status: "pending" | "authorized" | "captured" | "failed";
  providerReference: string | null;
};

export type PaymentWebhookEvent = {
  provider: string;
  providerEventId: string;
  providerReference: string;
  orderId: string;
  amount: bigint;
  currency: string;
  status: "authorized" | "captured" | "failed" | "refunded";
  /** ISO timestamp from provider when available. */
  occurredAt?: string;
  rawSafePayload?: Record<string, unknown>;
};

export type PaymentWebhookVerification = {
  ok: true;
  event: PaymentWebhookEvent;
} | {
  ok: false;
  reason:
    | "INVALID_SIGNATURE"
    | "REPLAY"
    | "AMOUNT_MISMATCH"
    | "CURRENCY_MISMATCH"
    | "ORDER_MISMATCH"
    | "UNSUPPORTED";
};

/**
 * Payment provider boundary.
 * Online adapters MAY implement webhook verification; COD does not.
 */
export type PaymentAdapter = {
  readonly name: string;
  createPayment(intent: PaymentIntent): Promise<PaymentResult>;
  verifyWebhook?(
    headers: Headers,
    rawBody: string,
  ): Promise<PaymentWebhookVerification>;
};
