export const CHECKOUT_PAYMENT_METHODS = [
  "cash_on_delivery",
  "idram",
  "arca",
] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

export function isCheckoutPaymentMethod(
  value: string,
): value is CheckoutPaymentMethod {
  return (CHECKOUT_PAYMENT_METHODS as readonly string[]).includes(value);
}

/** Maps checkout UI payment choice to payments.provider / payments.method. */
export function toPaymentRecord(method: CheckoutPaymentMethod): {
  provider: string;
  method: string;
} {
  switch (method) {
    case "idram":
      return { provider: "idram", method: "IDRAM" };
    case "arca":
      return { provider: "arca", method: "ARCA" };
    case "cash_on_delivery":
      return { provider: "cod", method: "COD" };
  }
}
