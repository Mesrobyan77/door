import type { Currency } from "@/lib/money/currency";
import { getCurrencyMeta } from "@/lib/money/currency-meta";
import type { MoneyAmount } from "@/lib/money/amount";
import { money } from "@/lib/money/amount";

/** Fixed-point scale for exchange-rate decimal strings (matches DB numeric scale). */
export const EXCHANGE_RATE_SCALE = 8;

const RATE_FACTOR = 10n ** BigInt(EXCHANGE_RATE_SCALE);

/**
 * Normalizes admin/locale decimal input to a canonical rate string.
 * Accepts European comma decimals (`0,2137` → `0.2137`).
 */
export function normalizeRateDecimalString(rate: string): string {
  const trimmed = rate.trim().replace(/\s/g, "");
  if (/^\d+,\d+$/.test(trimmed)) {
    return trimmed.replace(",", ".");
  }
  return trimmed;
}

/**
 * Parses a positive decimal rate string into fixed-point bigint at EXCHANGE_RATE_SCALE.
 * Example: "0.0026" → 260000n (0.0026 * 10^8).
 */
export function parseRateToFixed(rate: string): bigint {
  const trimmed = normalizeRateDecimalString(rate);
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid exchange rate: ${rate}`);
  }

  const [wholePart, fractionPart = ""] = trimmed.split(".");
  const whole = BigInt(wholePart ?? "0");
  const padded = (fractionPart + "0".repeat(EXCHANGE_RATE_SCALE)).slice(
    0,
    EXCHANGE_RATE_SCALE,
  );
  const fraction = BigInt(padded || "0");
  const fixed = whole * RATE_FACTOR + fraction;

  if (fixed <= 0n) {
    throw new Error(`Exchange rate must be positive: ${rate}`);
  }

  return fixed;
}

/** Half-up division for non-negative bigints. */
export function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error("Denominator must be positive");
  }
  if (numerator < 0n) {
    throw new Error("Numerator must be non-negative for money conversion");
  }

  return (numerator + denominator / 2n) / denominator;
}

/**
 * Converts a base-currency integer amount to quote currency minor units.
 * `rate` is quote major units per 1 base major unit (e.g. AMD→USD 0.0026).
 */
export function convertAmount(
  baseAmount: bigint | number,
  rate: string,
  from: Currency,
  to: Currency,
): MoneyAmount {
  const amount =
    typeof baseAmount === "number" ? BigInt(baseAmount) : baseAmount;

  if (amount < 0n) {
    throw new Error("Cannot convert negative money amount");
  }

  if (from === to) {
    return money(amount, to);
  }

  const fromMeta = getCurrencyMeta(from);
  const toMeta = getCurrencyMeta(to);
  const rateFixed = parseRateToFixed(rate);
  const scaleDiff = BigInt(toMeta.scale - fromMeta.scale);

  // result = amount * rate * 10^(toScale - fromScale)
  //        = amount * rateFixed * 10^scaleDiff / 10^RATE_SCALE
  let numerator = amount * rateFixed;
  let denominator = RATE_FACTOR;

  if (scaleDiff >= 0n) {
    numerator *= 10n ** scaleDiff;
  } else {
    denominator *= 10n ** -scaleDiff;
  }

  return money(divRoundHalfUp(numerator, denominator), to);
}
