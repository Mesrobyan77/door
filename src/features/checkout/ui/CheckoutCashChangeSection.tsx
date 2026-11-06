"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";

import {
  CASH_CHANGE_NONE,
  CASH_NOTE_SRC,
  visibleCashDenominations,
  type CashChangeValue,
} from "@/features/checkout/ui/checkout-payment-assets";
import { currencySymbols } from "@/lib/money/currency";

type CheckoutCashChangeSectionProps = {
  value: CashChangeValue;
  disabled: boolean;
  title: string;
  hint: string;
  noneLabel: string;
  /** e.g. "Courier should give change: {amount}֏" */
  courierChangeLabel: string;
  /** Order total in AMD major units (scale 0). */
  orderTotalAmount: number;
  onChange: (value: CashChangeValue) => void;
};

function noteButtonClass(selected: boolean): string {
  return `flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-[18px] border-2 outline-none transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-50 ${
    selected
      ? "border-gray-900 bg-gray-50"
      : "border-gray-200 bg-white hover:border-gray-300"
  }`;
}

function formatDram(amount: number): string {
  return `${amount.toLocaleString("en-US")} ${currencySymbols.AMD}`;
}

function formatChangeAmount(amount: number): string {
  return `${amount.toLocaleString("en-US")}${currencySymbols.AMD}`;
}

/** Cash-change denomination picker shown under Cash on Delivery. */
export function CheckoutCashChangeSection({
  value,
  disabled,
  title,
  hint,
  noneLabel,
  courierChangeLabel,
  orderTotalAmount,
  onChange,
}: CheckoutCashChangeSectionProps) {
  const visibleNotes = useMemo(
    () => visibleCashDenominations(orderTotalAmount),
    [orderTotalAmount],
  );

  const changeDue = useMemo(() => {
    if (value === CASH_CHANGE_NONE) return null;
    const tendered = Number(value);
    if (!Number.isFinite(tendered) || tendered < orderTotalAmount) {
      return null;
    }
    return tendered - orderTotalAmount;
  }, [orderTotalAmount, value]);

  useEffect(() => {
    if (value === CASH_CHANGE_NONE) return;
    const selectedAmount = Number(value);
    if (
      !Number.isFinite(selectedAmount) ||
      selectedAmount < orderTotalAmount
    ) {
      onChange(CASH_CHANGE_NONE);
    }
  }, [orderTotalAmount, value, onChange]);

  return (
    <div
      className="rounded-[18px] border border-gray-200 bg-white p-4 sm:p-5"
      data-cash-change-section
    >
      <h3 className="text-base font-bold tracking-wide text-gray-900">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-snug text-gray-600">{hint}</p>
      <div
        className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3"
        role="radiogroup"
        aria-label={title}
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === CASH_CHANGE_NONE}
          disabled={disabled}
          className={`${noteButtonClass(value === CASH_CHANGE_NONE)} aspect-[2/1] px-2 text-center text-xs font-semibold leading-snug text-gray-900 sm:text-sm`}
          onClick={() => onChange(CASH_CHANGE_NONE)}
        >
          {noneLabel}
        </button>
        {visibleNotes.map((amount) => {
          const key = String(amount) as CashChangeValue;
          const selected = value === key;
          return (
            <button
              key={amount}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              className={`${noteButtonClass(selected)} relative aspect-[2/1] p-0`}
              onClick={() => onChange(key)}
              aria-label={formatDram(amount)}
              title={formatDram(amount)}
            >
              <Image
                src={CASH_NOTE_SRC[amount]}
                alt={formatDram(amount)}
                fill
                sizes="(max-width: 1024px) 45vw, 160px"
                className="object-cover object-center"
              />
            </button>
          );
        })}
      </div>
      {changeDue !== null ? (
        <p className="mt-4 text-sm font-medium text-gray-900">
          {courierChangeLabel.replace(
            "{amount}",
            formatChangeAmount(changeDue),
          )}
        </p>
      ) : null}
    </div>
  );
}
