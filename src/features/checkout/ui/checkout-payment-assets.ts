export const CASH_CHANGE_NONE = "none";

export const CASH_CHANGE_DENOMINATIONS = [
  2000, 5000, 10000, 20000, 50000, 100000,
] as const;

export type CashChangeDenomination =
  (typeof CASH_CHANGE_DENOMINATIONS)[number];

export type CashChangeValue = typeof CASH_CHANGE_NONE | `${CashChangeDenomination}`;

export const CASH_NOTE_SRC: Record<CashChangeDenomination, string> = {
  2000: "/assets/payments/amd/2000.webp",
  5000: "/assets/payments/amd/5000.webp",
  10000: "/assets/payments/amd/10000.webp",
  20000: "/assets/payments/amd/20000.webp",
  50000: "/assets/payments/amd/50000.webp",
  100000: "/assets/payments/amd/100000.webp",
};

export const CARD_BRAND_LOGOS = [
  {
    alt: "Visa",
    src: "/assets/payments/checkout/visa.webp",
    sourceWidthPx: 877,
    sourceHeightPx: 284,
    innerLogoScale: 0.9,
  },
  {
    alt: "Mastercard",
    src: "/assets/payments/checkout/mastercard.webp",
    sourceWidthPx: 567,
    sourceHeightPx: 440,
    innerLogoScale: 1.25,
  },
  {
    alt: "ArCa",
    src: "/assets/payments/checkout/arca.webp",
    sourceWidthPx: 1024,
    sourceHeightPx: 1024,
    innerLogoScale: 3.5,
  },
] as const;

export const IDRAM_LOGO_SRC = "/assets/payments/idram.webp";

/** Banknotes that can cover the order total (denomination >= total AMD). */
export function visibleCashDenominations(
  orderTotalAmount: number,
): CashChangeDenomination[] {
  return CASH_CHANGE_DENOMINATIONS.filter(
    (amount) => amount >= orderTotalAmount,
  );
}
