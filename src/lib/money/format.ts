import type { Currency } from "@/lib/money/currency";
import { getCurrencyMeta } from "@/lib/money/currency-meta";

/** Narrow no-break space — stable across Node and browsers (unlike Intl hy/AMD). */
const GROUP_SEPARATOR = "\u202f";

/**
 * Formats the major-unit number without Intl currency style.
 * Avoids SSR/client hydration mismatches from ICU differences (e.g. hy + AMD).
 */
function formatMajorAmount(major: number, fractionDigits: number): string {
  const sign = major < 0 ? "-" : "";
  const absolute = Math.abs(major);
  const [integerPart = "0", fractionPart] = absolute
    .toFixed(fractionDigits)
    .split(".");
  const grouped = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    GROUP_SEPARATOR,
  );

  if (fractionDigits > 0 && fractionPart !== undefined) {
    return `${sign}${grouped}.${fractionPart}`;
  }

  return `${sign}${grouped}`;
}

/** Formats an integer minor-unit amount with a stable currency code suffix. */
export function formatMoneyAmount(
  amount: bigint | number,
  currency: Currency,
  locale: string,
): string {
  void locale;
  const meta = getCurrencyMeta(currency);
  const raw = typeof amount === "bigint" ? Number(amount) : amount;

  if (!Number.isFinite(raw)) {
    throw new Error("Money amount is not finite");
  }

  const major = raw / 10 ** meta.scale;
  return `${formatMajorAmount(major, meta.fractionDigits)} ${currency}`;
}
