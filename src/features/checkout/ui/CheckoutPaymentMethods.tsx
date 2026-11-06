"use client";

import { useState } from "react";
import Image from "next/image";

import type { CheckoutPaymentMethod } from "@/features/checkout/domain/payment-methods";
import { CheckoutCashChangeSection } from "@/features/checkout/ui/CheckoutCashChangeSection";
import {
  CARD_BRAND_LOGOS,
  CASH_CHANGE_NONE,
  IDRAM_LOGO_SRC,
  type CashChangeValue,
} from "@/features/checkout/ui/checkout-payment-assets";

type PaymentOption = {
  id: CheckoutPaymentMethod;
  name: string;
  shortName: string;
  description: string;
};

type CheckoutPaymentMethodsProps = {
  title: string;
  options: PaymentOption[];
  value: CheckoutPaymentMethod;
  onChange: (method: CheckoutPaymentMethod) => void;
  disabled: boolean;
  cashChangeValue: CashChangeValue;
  onCashChangeValue: (value: CashChangeValue) => void;
  cashChangeTitle: string;
  cashChangeHint: string;
  cashChangeNone: string;
  cashChangeCourier: string;
  orderTotalAmount: number;
};

const OPTION_BASE =
  "flex cursor-pointer items-center border-2 p-4 outline-none transition-all rounded-[15px]";
const OPTION_SELECTED = "border-gray-900 bg-gray-50";
const OPTION_IDLE = "border-gray-200 hover:bg-gray-50/80";

function CashWalletIcon({ sizePx }: { sizePx: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className="shrink-0 text-gray-900"
      style={{ width: sizePx, height: sizePx }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="3"
        y="9"
        width="26"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle
        cx="16"
        cy="16"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M3 13h26" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function framedBoxSize(
  logoHeightPx: number,
  paddingPx: number,
  boxHeightPx: number,
): { widthPx: number; heightPx: number } {
  const visa = CARD_BRAND_LOGOS.find((badge) => badge.alt === "Visa");
  if (!visa) {
    return {
      widthPx: logoHeightPx + 2 * paddingPx,
      heightPx: boxHeightPx,
    };
  }
  const logoWidthPx = Math.round(
    visa.sourceWidthPx * (logoHeightPx / visa.sourceHeightPx),
  );
  return {
    widthPx: logoWidthPx + 2 * paddingPx,
    heightPx: boxHeightPx,
  };
}

function CardBrandBadge({
  badge,
  radiusPx,
  paddingPx,
  boxSize,
}: {
  badge: (typeof CARD_BRAND_LOGOS)[number];
  radiusPx: number;
  paddingPx: number;
  boxSize: { widthPx: number; heightPx: number };
}) {
  return (
    <div
      className="box-border flex shrink-0 items-center justify-center overflow-hidden border border-gray-200 bg-white"
      style={{
        width: boxSize.widthPx,
        height: boxSize.heightPx,
        borderRadius: radiusPx,
        padding: paddingPx,
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: `scale(${badge.innerLogoScale})`,
          transformOrigin: "center",
        }}
      >
        <Image
          src={badge.src}
          alt={badge.alt}
          fill
          sizes={`${boxSize.widthPx}px`}
          className="object-contain object-center"
        />
      </div>
    </div>
  );
}

function CardBrandLogos() {
  const mobileBox = framedBoxSize(22, 4, 30);
  const desktopBox = framedBoxSize(24, 8, 40);

  return (
    <>
      <div
        className="flex max-w-full flex-wrap items-center justify-start self-start lg:hidden"
        style={{ gap: 4 }}
      >
        {CARD_BRAND_LOGOS.map((badge) => (
          <CardBrandBadge
            key={badge.alt}
            badge={badge}
            radiusPx={5}
            paddingPx={4}
            boxSize={mobileBox}
          />
        ))}
      </div>
      <div
        className="hidden shrink-0 flex-nowrap items-center justify-start lg:flex"
        style={{ gap: 8 }}
      >
        {CARD_BRAND_LOGOS.map((badge) => (
          <CardBrandBadge
            key={badge.alt}
            badge={badge}
            radiusPx={8}
            paddingPx={8}
            boxSize={desktopBox}
          />
        ))}
      </div>
    </>
  );
}

function IdramLogo({
  errored,
  onError,
}: {
  errored: boolean;
  onError: () => void;
}) {
  return (
    <>
      <div
        className="relative flex shrink-0 items-center justify-center overflow-hidden border border-gray-200 bg-white px-1.5 lg:hidden"
        style={{ width: 96, height: 40, borderRadius: 8 }}
      >
        {errored ? (
          <span className="text-xs font-semibold text-gray-500">iDram</span>
        ) : (
          <Image
            src={IDRAM_LOGO_SRC}
            alt="iDram"
            width={80}
            height={26}
            className="h-[26px] w-auto object-contain object-center"
            onError={onError}
          />
        )}
      </div>
      <div
        className="relative hidden shrink-0 items-center justify-center overflow-hidden border border-gray-200 bg-white px-2 lg:flex"
        style={{ width: 112, height: 40, borderRadius: 8 }}
      >
        {errored ? (
          <span className="text-xs font-semibold text-gray-500">iDram</span>
        ) : (
          <Image
            src={IDRAM_LOGO_SRC}
            alt="iDram"
            width={96}
            height={32}
            className="h-8 w-auto object-contain object-center"
            onError={onError}
          />
        )}
      </div>
    </>
  );
}

function CustomRadio({
  checked,
  disabled,
  name,
  value,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  name: string;
  value: string;
  onChange: () => void;
}) {
  return (
    <span className="relative mr-4 inline-flex h-5 w-5 shrink-0 items-center justify-center self-center">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full border-2 border-gray-300 bg-white transition-colors peer-checked:border-gray-900 peer-disabled:opacity-50"
      />
      <span
        aria-hidden
        className="pointer-events-none h-2.5 w-2.5 scale-0 rounded-full bg-gray-900 transition-transform peer-checked:scale-100 peer-disabled:opacity-50"
      />
    </span>
  );
}

function PaymentOptionBody({
  option,
  idramLogoError,
  onIdramLogoError,
}: {
  option: PaymentOption;
  idramLogoError: boolean;
  onIdramLogoError: () => void;
}) {
  if (option.id === "cash_on_delivery") {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
        <div className="flex shrink-0 items-center justify-center lg:hidden">
          <CashWalletIcon sizePx={42} />
        </div>
        <div className="hidden shrink-0 items-center justify-center lg:flex">
          <CashWalletIcon sizePx={36} />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-gray-900">{option.name}</div>
          <div className="text-sm text-gray-600">{option.description}</div>
        </div>
      </div>
    );
  }

  if (option.id === "idram") {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <div className="font-medium text-gray-900">{option.name}</div>
        <div className="flex max-w-full flex-wrap items-center gap-3">
          <IdramLogo errored={idramLogoError} onError={onIdramLogoError} />
          <div className="min-w-0 text-sm text-gray-600">
            {option.description}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
      <div className="font-medium text-gray-900">{option.name}</div>
      <CardBrandLogos />
      <div className="text-sm text-gray-600">{option.description}</div>
    </div>
  );
}

export function CheckoutPaymentMethods({
  title,
  options,
  value,
  onChange,
  disabled,
  cashChangeValue,
  onCashChangeValue,
  cashChangeTitle,
  cashChangeHint,
  cashChangeNone,
  cashChangeCourier,
  orderTotalAmount,
}: CheckoutPaymentMethodsProps) {
  const [idramLogoError, setIdramLogoError] = useState(false);

  return (
    <section className="rounded-3xl bg-white px-5 py-6 shadow-sm ring-1 ring-gray-200/80 sm:px-6 sm:py-7">
      <h2 className="mb-6 text-lg font-bold tracking-tight text-gray-900">
        {title}
      </h2>
      <div className="space-y-3">
        {options.map((option) => {
          const selected = value === option.id;

          return (
            <div key={option.id} className="space-y-3">
              <label
                className={`${OPTION_BASE} ${selected ? OPTION_SELECTED : OPTION_IDLE}`}
                style={{ minHeight: 50 }}
              >
                <CustomRadio
                  name="paymentMethod"
                  value={option.id}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => {
                    onChange(option.id);
                    if (option.id === "cash_on_delivery") {
                      onCashChangeValue(cashChangeValue || CASH_CHANGE_NONE);
                    }
                  }}
                />
                <PaymentOptionBody
                  option={option}
                  idramLogoError={idramLogoError}
                  onIdramLogoError={() => setIdramLogoError(true)}
                />
              </label>

              {option.id === "cash_on_delivery" && selected ? (
                <CheckoutCashChangeSection
                  value={cashChangeValue}
                  disabled={disabled}
                  title={cashChangeTitle}
                  hint={cashChangeHint}
                  noneLabel={cashChangeNone}
                  courierChangeLabel={cashChangeCourier}
                  orderTotalAmount={orderTotalAmount}
                  onChange={onCashChangeValue}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <input type="hidden" name="cashChangeFor" value={cashChangeValue} />
    </section>
  );
}
