export const currencies = ["AMD", "USD", "RUB"] as const;

export type Currency = (typeof currencies)[number];

export const defaultCurrency: Currency = "AMD";

export const currencyLabels: Record<Currency, string> = {
  AMD: "AMD",
  USD: "USD",
  RUB: "RUB",
};

export const currencySymbols: Record<Currency, string> = {
  AMD: "֏",
  USD: "$",
  RUB: "₽",
};

export function isCurrency(value: string): value is Currency {
  return (currencies as readonly string[]).includes(value);
}
