/** Canonical payment statuses from the database enum. */
export const PAYMENT_STATUSES = [
  "PENDING",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Admin orders table dropdown options (label → DB status). */
export const ADMIN_PAYMENT_STATUS_OPTIONS = [
  { value: "CAPTURED", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
] as const satisfies ReadonlyArray<{ value: PaymentStatus; label: string }>;

/**
 * Admin-driven payment transitions (COD and manual corrections).
 * Admin list allows free moves among Paid / Pending / Failed.
 */
const TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ["CAPTURED", "FAILED", "AUTHORIZED", "CANCELLED"],
  AUTHORIZED: ["CAPTURED", "FAILED", "CANCELLED", "PENDING"],
  CAPTURED: ["PENDING", "FAILED", "REFUNDED"],
  FAILED: ["PENDING", "CAPTURED", "CANCELLED"],
  REFUNDED: ["PENDING"],
  CANCELLED: ["PENDING", "FAILED"],
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  AUTHORIZED: "Pending",
  CAPTURED: "Paid",
  FAILED: "Failed",
  REFUNDED: "Failed",
  CANCELLED: "Failed",
};

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

/** Human label for admin orders table. */
export function paymentStatusLabel(status: string): string {
  if (!isPaymentStatus(status)) return status;
  return PAYMENT_STATUS_LABELS[status];
}

/** Returns payment statuses an admin may move to from `from`. */
export function getEligiblePaymentStatuses(
  from: PaymentStatus,
): PaymentStatus[] {
  return [...TRANSITIONS[from]];
}

/** Whether `from → to` is a permitted payment transition. */
export function canTransitionPaymentStatus(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}
