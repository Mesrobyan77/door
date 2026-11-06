import type { Locale } from "@/lib/i18n/config";

/** Compact date for profile order cards so it stays on one line (e.g. 15.08.2026). */
export function formatShortDate(
  value: string | Date,
  locale: Locale | string,
): string {
  void locale;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
