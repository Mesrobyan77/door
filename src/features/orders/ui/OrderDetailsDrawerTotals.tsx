import type { AdminOrderDetailView } from "@/features/orders/application/order-detail-view";
import { formatOrderDrawerMoney } from "@/features/orders/ui/order-drawer-format";

type OrderDetailsDrawerTotalsProps = {
  detail: AdminOrderDetailView;
};

export function OrderDetailsDrawerTotals({
  detail,
}: OrderDetailsDrawerTotalsProps) {
  const shippingLabel = detail.isPickup
    ? "Free (Store Pickup)"
    : formatOrderDrawerMoney(detail.deliveryAmount, detail.baseCurrency);

  const discountLabel =
    detail.discountAmount > 0
      ? `−${formatOrderDrawerMoney(detail.discountAmount, detail.baseCurrency)}`
      : formatOrderDrawerMoney(0, detail.baseCurrency);

  return (
    <div className="rounded-2xl border border-gray-200 px-5 py-4">
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium text-gray-900">
            {formatOrderDrawerMoney(detail.subtotalAmount, detail.baseCurrency)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600">
            Delivery
            {!detail.isPickup && detail.deliveryLabel
              ? ` (${detail.deliveryLabel})`
              : ""}
          </span>
          <span className="font-medium text-gray-900">{shippingLabel}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600">
            Coupon discount
            {detail.couponCode ? ` (${detail.couponCode})` : ""}
          </span>
          <span
            className={`font-medium ${
              detail.discountAmount > 0 ? "text-green-700" : "text-gray-900"
            }`}
          >
            {discountLabel}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-3">
          <span className="text-base font-semibold text-gray-900">Total</span>
          <span className="text-base font-semibold text-gray-900">
            {formatOrderDrawerMoney(detail.totalAmount, detail.baseCurrency)}
          </span>
        </div>
      </div>
    </div>
  );
}
