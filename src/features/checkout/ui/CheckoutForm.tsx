"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";

import { Card } from "@/components/ui/Card";
import type { CheckoutOrderProduct } from "@/features/checkout/ui/checkout-order-product";
import { previewCouponAction } from "@/features/checkout/application/preview-coupon";
import { createOrderAction } from "@/features/checkout/create-order";
import type { CheckoutPaymentMethod } from "@/features/checkout/domain/payment-methods";
import { CheckoutDetailsSections } from "@/features/checkout/ui/CheckoutDetailsSections";
import {
  CASH_CHANGE_NONE,
  type CashChangeValue,
} from "@/features/checkout/ui/checkout-payment-assets";
import { CheckoutOrderSummary } from "@/features/checkout/ui/CheckoutOrderSummary";
import { CheckoutProductsInOrder } from "@/features/checkout/ui/CheckoutProductsInOrder";
import type { CheckoutDeliveryOption } from "@/features/delivery/application/queries";
import type { Locale } from "@/lib/i18n/config";
import { formatMoneyAmount } from "@/lib/money/format";

type CheckoutLabels = {
  title: string;
  titleLead: string;
  titleAccent: string;
  productsInOrder: string;
  itemsOne: string;
  itemsMany: string;
  removeItem: string;
  contactInformation: string;
  shippingMethod: string;
  shippingAddress: string;
  paymentMethod: string;
  orderSummary: string;
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
  freePickup: string;
  enterCity: string;
  selectDeliveryLocation: string;
  cashOnDelivery: string;
  cashShort: string;
  cashOnDeliveryDescription: string;
  cashChangeTitle: string;
  cashChangeHint: string;
  cashChangeNone: string;
  cashChangeCourier: string;
  idram: string;
  idramDescription: string;
  card: string;
  cardDescription: string;
  couponTitle: string;
  couponPlaceholder: string;
  couponApply: string;
  couponApplying: string;
  discount: string;
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  placeOrder: string;
  processing: string;
  continueShopping: string;
  cartEmpty: string;
  cartEmptyDescription: string;
  cartEmptyCta: string;
};

type CheckoutFormProps = {
  locale: Locale;
  labels: CheckoutLabels;
  productsHref: string;
  orderProducts: CheckoutOrderProduct[];
  defaultFirstName: string;
  defaultLastName: string;
  defaultEmail: string;
  defaultPhone: string;
  defaultLine1: string;
  subtotalAmount: number;
  deliveryOptions: CheckoutDeliveryOption[];
  hasItems: boolean;
};

function quoteDeliveryAmount(
  option: CheckoutDeliveryOption | undefined,
  subtotalAmount: number,
): number {
  if (!option) return 0;
  if (
    option.freeThresholdAmount !== null &&
    subtotalAmount >= option.freeThresholdAmount
  ) {
    return 0;
  }
  return option.priceAmount;
}

export function CheckoutForm({
  locale,
  labels,
  productsHref,
  orderProducts,
  defaultFirstName,
  defaultLastName,
  defaultEmail,
  defaultPhone,
  defaultLine1,
  subtotalAmount,
  deliveryOptions,
  hasItems,
}: CheckoutFormProps) {
  const router = useRouter();
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const defaultRuleId = deliveryOptions[0]?.id ?? "";
  const [shippingMethod, setShippingMethod] = useState<"pickup" | "delivery">(
    deliveryOptions.length > 0 ? "delivery" : "pickup",
  );
  const [deliveryRuleId, setDeliveryRuleId] = useState(defaultRuleId);
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>("cash_on_delivery");
  const [cashChangeFor, setCashChangeFor] =
    useState<CashChangeValue>(CASH_CHANGE_NONE);
  const [error, setError] = useState<string | null>(null);
  const [couponDraft, setCouponDraft] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(
    null,
  );
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [applyingCoupon, startApplyCoupon] = useTransition();

  const selectedDelivery = deliveryOptions.find(
    (option) => option.id === deliveryRuleId,
  );

  const paymentOptions = useMemo(
    () => [
      {
        id: "cash_on_delivery" as const,
        name: labels.cashOnDelivery,
        shortName: labels.cashShort,
        description: labels.cashOnDeliveryDescription,
      },
      {
        id: "idram" as const,
        name: labels.idram,
        shortName: labels.idram,
        description: labels.idramDescription,
      },
      {
        id: "arca" as const,
        name: labels.card,
        shortName: labels.card,
        description: labels.cardDescription,
      },
    ],
    [
      labels.card,
      labels.cardDescription,
      labels.cashOnDelivery,
      labels.cashOnDeliveryDescription,
      labels.cashShort,
      labels.idram,
      labels.idramDescription,
    ],
  );

  function onPaymentMethodChange(method: CheckoutPaymentMethod): void {
    setPaymentMethod(method);
    if (method === "cash_on_delivery" && !cashChangeFor) {
      setCashChangeFor(CASH_CHANGE_NONE);
    }
  }

  function formatMoney(amount: number): string {
    return formatMoneyAmount(amount, "AMD", locale);
  }

  const quotedDelivery = quoteDeliveryAmount(selectedDelivery, subtotalAmount);
  const shippingAmount = shippingMethod === "pickup" ? 0 : quotedDelivery;
  const totalAmount =
    Math.max(0, subtotalAmount - discountAmount) + shippingAmount;

  const shippingFormatted =
    shippingMethod === "pickup"
      ? labels.freePickup
      : selectedDelivery
        ? `${formatMoney(shippingAmount)} (${selectedDelivery.label})`
        : labels.selectDeliveryLocation;

  function clearAppliedCoupon(): void {
    setAppliedCouponCode(null);
    setDiscountAmount(0);
  }

  function onCouponDraftChange(value: string): void {
    setCouponDraft(value);
    setCouponError(null);
    if (appliedCouponCode) {
      clearAppliedCoupon();
    }
  }

  function onApplyCoupon(): void {
    const code = couponDraft.trim();
    if (!code) {
      return;
    }

    setCouponError(null);
    startApplyCoupon(async () => {
      const result = await previewCouponAction({ couponCode: code });
      if (!result.ok) {
        clearAppliedCoupon();
        setCouponError(result.error);
        return;
      }

      setAppliedCouponCode(result.code);
      setCouponDraft(result.code);
      setDiscountAmount(result.discountAmount);
      setCouponError(null);
    });
  }

  if (!hasItems) {
    return (
      <div className="mx-auto w-full max-w-[1024px] px-4 pt-[45px] pb-16 sm:px-6 lg:px-6 lg:pt-12 lg:pb-12">
        <h1 className="mb-6 text-[26px] leading-tight font-black uppercase text-gray-900 sm:text-[30px] sm:leading-[1.2]">
          <span className="block">{labels.titleLead}</span>
          {labels.titleAccent ? (
            <span className="block">{labels.titleAccent}</span>
          ) : null}
        </h1>
        <Card className="rounded-2xl border border-gray-200/80 p-6 text-center shadow-none">
          <p className="mb-2 text-lg font-semibold text-gray-900">
            {labels.cartEmpty}
          </p>
          <p className="mb-6 text-gray-600">{labels.cartEmptyDescription}</p>
          <Link
            href={productsHref}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800"
          >
            {labels.cartEmptyCta}
          </Link>
        </Card>
      </div>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await createOrderAction({
        locale,
        idempotencyKey,
        firstName: String(data.get("firstName") ?? ""),
        lastName: String(data.get("lastName") ?? ""),
        contactEmail: String(data.get("contactEmail") ?? ""),
        contactPhone: String(data.get("contactPhone") ?? ""),
        shippingMethod,
        paymentMethod,
        deliveryRuleId:
          shippingMethod === "delivery" ? deliveryRuleId || undefined : undefined,
        city:
          shippingMethod === "delivery"
            ? selectedDelivery?.city
            : undefined,
        line1:
          shippingMethod === "delivery"
            ? String(data.get("line1") ?? "")
            : undefined,
        couponCode: appliedCouponCode ?? undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/${locale}/checkout/success/${result.orderNumber}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1024px] px-4 pt-[45px] pb-16 sm:px-6 lg:px-6 lg:pt-12 lg:pb-12">
      <h1 className="mb-6 text-[26px] leading-tight font-black uppercase text-gray-900 sm:text-[30px] sm:leading-[1.2]">
        <span className="block">{labels.titleLead}</span>
        {labels.titleAccent ? (
          <span className="block">{labels.titleAccent}</span>
        ) : null}
      </h1>

      <CheckoutProductsInOrder
        products={orderProducts}
        title={labels.productsInOrder}
        itemsOneLabel={labels.itemsOne}
        itemsManyLabel={labels.itemsMany}
        removeItemLabel={labels.removeItem}
        onCartChanged={clearAppliedCoupon}
      />

      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <CheckoutDetailsSections
            labels={labels}
            pending={pending}
            shippingMethod={shippingMethod}
            onShippingMethodChange={setShippingMethod}
            deliveryOptions={deliveryOptions}
            deliveryRuleId={deliveryRuleId}
            onDeliveryRuleChange={setDeliveryRuleId}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={onPaymentMethodChange}
            paymentOptions={paymentOptions}
            cashChangeValue={cashChangeFor}
            onCashChangeValue={setCashChangeFor}
            orderTotalAmount={totalAmount}
            defaultFirstName={defaultFirstName}
            defaultLastName={defaultLastName}
            defaultEmail={defaultEmail}
            defaultPhone={defaultPhone}
            defaultLine1={defaultLine1}
          />

          <CheckoutOrderSummary
            title={labels.orderSummary}
            couponTitle={labels.couponTitle}
            couponPlaceholder={labels.couponPlaceholder}
            couponApplyLabel={labels.couponApply}
            couponApplyingLabel={labels.couponApplying}
            discountLabel={labels.discount}
            subtotalLabel={labels.subtotal}
            shippingLabel={labels.shipping}
            taxLabel={labels.tax}
            totalLabel={labels.total}
            subtotalFormatted={formatMoney(subtotalAmount)}
            shippingFormatted={shippingFormatted}
            taxFormatted={formatMoney(0)}
            discountFormatted={
              discountAmount > 0 ? formatMoney(discountAmount) : null
            }
            totalFormatted={formatMoney(totalAmount)}
            couponDraft={couponDraft}
            onCouponDraftChange={onCouponDraftChange}
            onApplyCoupon={onApplyCoupon}
            couponError={couponError}
            isApplyingCoupon={applyingCoupon}
            error={error}
            isSubmitting={pending}
            placeOrderLabel={labels.placeOrder}
            processingLabel={labels.processing}
          />
        </div>
      </form>
    </div>
  );
}
