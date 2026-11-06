"use client";

import { SelectDropdown } from "@/components/ui/SelectDropdown";
import type { CheckoutPaymentMethod } from "@/features/checkout/domain/payment-methods";
import { CheckoutPaymentMethods } from "@/features/checkout/ui/CheckoutPaymentMethods";
import type { CashChangeValue } from "@/features/checkout/ui/checkout-payment-assets";
import type { CheckoutDeliveryOption } from "@/features/delivery/application/queries";

const FIELD_CLASS =
  "h-11 w-full rounded-2xl border border-gray-200 px-4 text-gray-900 shadow-sm outline-none transition-colors hover:border-gray-300 focus:border-gray-300 disabled:bg-gray-50";

const SECTION_CLASS =
  "rounded-3xl bg-white px-5 py-6 shadow-sm ring-1 ring-gray-200/80 sm:px-6 sm:py-7";
const SECTION_TITLE_CLASS =
  "mb-6 text-lg font-bold tracking-tight text-gray-900";

const RADIO_BASE =
  "flex cursor-pointer items-center rounded-[15px] border-2 p-4 transition-all";
const RADIO_SELECTED = "border-gray-900 bg-gray-50";
const RADIO_IDLE = "border-gray-200 hover:bg-gray-50/80";

type CheckoutDetailsLabels = {
  contactInformation: string;
  shippingMethod: string;
  shippingAddress: string;
  paymentMethod: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  deliveryLocation: string;
  selectLocation: string;
  phonePlaceholder: string;
  cityPlaceholder: string;
  addressPlaceholder: string;
  storePickup: string;
  storePickupDescription: string;
  delivery: string;
  deliveryDescription: string;
};

type PaymentOption = {
  id: CheckoutPaymentMethod;
  name: string;
  shortName: string;
  description: string;
};

type CheckoutDetailsSectionsProps = {
  labels: CheckoutDetailsLabels & {
    cashChangeTitle: string;
    cashChangeHint: string;
    cashChangeNone: string;
    cashChangeCourier: string;
  };
  pending: boolean;
  shippingMethod: "pickup" | "delivery";
  onShippingMethodChange: (method: "pickup" | "delivery") => void;
  deliveryOptions: CheckoutDeliveryOption[];
  deliveryRuleId: string;
  onDeliveryRuleChange: (ruleId: string) => void;
  paymentMethod: CheckoutPaymentMethod;
  onPaymentMethodChange: (method: CheckoutPaymentMethod) => void;
  paymentOptions: PaymentOption[];
  cashChangeValue: CashChangeValue;
  onCashChangeValue: (value: CashChangeValue) => void;
  orderTotalAmount: number;
  defaultFirstName: string;
  defaultLastName: string;
  defaultEmail: string;
  defaultPhone: string;
  defaultLine1: string;
};

function ShippingRadio({
  checked,
  disabled,
  value,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  value: string;
  onChange: () => void;
}) {
  return (
    <span className="relative mr-4 inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <input
        type="radio"
        name="shippingMethod"
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

export function CheckoutDetailsSections({
  labels,
  pending,
  shippingMethod,
  onShippingMethodChange,
  deliveryOptions,
  deliveryRuleId,
  onDeliveryRuleChange,
  paymentMethod,
  onPaymentMethodChange,
  paymentOptions,
  cashChangeValue,
  onCashChangeValue,
  orderTotalAmount,
  defaultFirstName,
  defaultLastName,
  defaultEmail,
  defaultPhone,
  defaultLine1,
}: CheckoutDetailsSectionsProps) {
  return (
    <div className="flex flex-col gap-4 lg:col-span-3">
      <section className={SECTION_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>{labels.contactInformation}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              {labels.firstName}
              <input
                name="firstName"
                required
                defaultValue={defaultFirstName}
                disabled={pending}
                className={FIELD_CLASS}
                autoComplete="given-name"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              {labels.lastName}
              <input
                name="lastName"
                required
                defaultValue={defaultLastName}
                disabled={pending}
                className={FIELD_CLASS}
                autoComplete="family-name"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              {labels.email}
              <input
                name="contactEmail"
                type="email"
                required
                defaultValue={defaultEmail}
                disabled={pending}
                className={FIELD_CLASS}
                autoComplete="email"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              {labels.phone}
              <input
                name="contactPhone"
                type="tel"
                required
                defaultValue={defaultPhone}
                placeholder={labels.phonePlaceholder}
                disabled={pending}
                className={FIELD_CLASS}
                autoComplete="tel"
              />
            </label>
          </div>
        </div>
      </section>

      <section className={SECTION_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>{labels.shippingMethod}</h2>
        <div className="space-y-3">
          <label
            className={`${RADIO_BASE} ${
              shippingMethod === "pickup" ? RADIO_SELECTED : RADIO_IDLE
            }`}
          >
            <ShippingRadio
              value="pickup"
              checked={shippingMethod === "pickup"}
              disabled={pending}
              onChange={() => onShippingMethodChange("pickup")}
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{labels.storePickup}</div>
              <div className="text-sm text-gray-600">
                {labels.storePickupDescription}
              </div>
            </div>
          </label>
          <label
            className={`${RADIO_BASE} ${
              shippingMethod === "delivery" ? RADIO_SELECTED : RADIO_IDLE
            }`}
          >
            <ShippingRadio
              value="delivery"
              checked={shippingMethod === "delivery"}
              disabled={pending || deliveryOptions.length === 0}
              onChange={() => onShippingMethodChange("delivery")}
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{labels.delivery}</div>
              <div className="text-sm text-gray-600">
                {labels.deliveryDescription}
              </div>
            </div>
          </label>
        </div>
      </section>

      {shippingMethod === "delivery" ? (
        <section className={SECTION_CLASS}>
          <h2 className={SECTION_TITLE_CLASS}>{labels.shippingAddress}</h2>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex w-fit max-w-full shrink-0 flex-col gap-1.5 text-sm font-medium text-gray-700">
              {labels.deliveryLocation}
              <SelectDropdown
                name="deliveryRuleId"
                ariaLabel={labels.deliveryLocation}
                value={deliveryRuleId}
                allLabel={labels.selectLocation}
                options={deliveryOptions.map((option) => ({
                  label: option.label,
                  value: option.id,
                }))}
                disabled={pending || deliveryOptions.length === 0}
                onValueChange={onDeliveryRuleChange}
                fitContent
              />
            </div>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-gray-700">
              {labels.address}
              <input
                name="line1"
                required
                defaultValue={defaultLine1}
                placeholder={labels.addressPlaceholder}
                disabled={pending}
                className={FIELD_CLASS}
                autoComplete="street-address"
              />
            </label>
          </div>
        </section>
      ) : null}

      <CheckoutPaymentMethods
        title={labels.paymentMethod}
        options={paymentOptions}
        value={paymentMethod}
        onChange={onPaymentMethodChange}
        disabled={pending}
        cashChangeValue={cashChangeValue}
        onCashChangeValue={onCashChangeValue}
        cashChangeTitle={labels.cashChangeTitle}
        cashChangeHint={labels.cashChangeHint}
        cashChangeNone={labels.cashChangeNone}
        cashChangeCourier={labels.cashChangeCourier}
        orderTotalAmount={orderTotalAmount}
      />
    </div>
  );
}
