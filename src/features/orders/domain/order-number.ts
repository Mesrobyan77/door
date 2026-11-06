/** Public order numbers: p100, p101, … (sequential, starting at 100). */
export const ORDER_NUMBER_PREFIX = "p";
export const ORDER_NUMBER_START = 100;

/** Stable advisory-lock key for serializing order-number allocation. */
export const ORDER_NUMBER_LOCK_KEY = 872_314_001;

const ORDER_NUMBER_PATTERN = /^p(\d+)$/;

/** Formats a sequence integer as a public order number. */
export function formatOrderNumber(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Order sequence must be a positive integer.");
  }
  return `${ORDER_NUMBER_PREFIX}${sequence}`;
}

/** Parses `p123` → 123; returns null for legacy/non-matching codes. */
export function parseOrderSequence(orderNumber: string): number | null {
  const match = ORDER_NUMBER_PATTERN.exec(orderNumber.trim());
  if (!match?.[1]) {
    return null;
  }
  const sequence = Number(match[1]);
  if (!Number.isInteger(sequence) || sequence < 1) {
    return null;
  }
  return sequence;
}

/**
 * Next sequence given the current max `pN` value in the DB.
 * Starts at {@link ORDER_NUMBER_START} when none exist yet.
 */
export function nextOrderSequence(
  maxExisting: number | string | null | undefined,
): number {
  if (maxExisting === null || maxExisting === undefined) {
    return ORDER_NUMBER_START;
  }
  const parsed =
    typeof maxExisting === "number" ? maxExisting : Number(maxExisting);
  if (!Number.isFinite(parsed)) {
    return ORDER_NUMBER_START;
  }
  return Math.max(ORDER_NUMBER_START, Math.floor(parsed) + 1);
}
