import type { Currency } from "@/lib/money/currency";

/** Integer minor-unit money amount. AMD uses whole dram (scale 0). */
export type MoneyAmount = {
  amount: bigint;
  currency: Currency;
};

export function money(amount: bigint | number, currency: Currency): MoneyAmount {
  if (typeof amount === "number") {
    if (!Number.isSafeInteger(amount)) {
      throw new Error("Money amount must be a safe integer");
    }

    return { amount: BigInt(amount), currency };
  }

  return { amount, currency };
}

export function assertNonNegative(value: MoneyAmount): void {
  if (value.amount < 0n) {
    throw new Error("Money amount cannot be negative");
  }
}

export function addMoney(left: MoneyAmount, right: MoneyAmount): MoneyAmount {
  if (left.currency !== right.currency) {
    throw new Error("Cannot add money with different currencies");
  }

  return { amount: left.amount + right.amount, currency: left.currency };
}

export function subtractMoney(
  left: MoneyAmount,
  right: MoneyAmount,
): MoneyAmount {
  if (left.currency !== right.currency) {
    throw new Error("Cannot subtract money with different currencies");
  }

  const result = left.amount - right.amount;
  if (result < 0n) {
    throw new Error("Money subtraction would become negative");
  }

  return { amount: result, currency: left.currency };
}
