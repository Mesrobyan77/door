import { MapPin } from "lucide-react";

import {
  ADMIN_BADGE,
  paymentStatusBadgeClass,
} from "@/features/admin/ui/status-badge";
import type { AdminOrderDetailView } from "@/features/orders/application/order-detail-view";
import {
  formatOrderDrawerMoney,
  formatOrderStatusLabel,
} from "@/features/orders/ui/order-drawer-format";

type OrderDetailsDrawerShippingProps = {
  detail: AdminOrderDetailView;
};

export function OrderDetailsDrawerShipping({
  detail,
}: OrderDetailsDrawerShippingProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-gray-200 px-5 py-4">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Shipping Address
        </h3>
        <dl className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-2">
            <dt className="text-gray-500">Shipping Method:</dt>
            <dd className="font-medium text-gray-900">{detail.shippingMethod}</dd>
          </div>
          {detail.isPickup ? (
            <div className="flex flex-wrap items-center gap-x-2">
              <dt className="text-gray-500">Pickup store:</dt>
              <dd className="font-medium text-gray-900">{detail.storeName}</dd>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <MapPin
              className="h-4 w-4 shrink-0 text-gray-400"
              aria-hidden
            />
            <dd className="min-w-0 font-medium text-gray-900">
              {detail.addressLine}
            </dd>
          </div>
          {detail.addressHint ? (
            <p className="text-xs text-gray-500">{detail.addressHint}</p>
          ) : null}
        </dl>
      </section>

      <section className="rounded-2xl border border-gray-200 px-5 py-4">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Payment</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-2">
            <dt className="text-gray-500">Method:</dt>
            <dd className="font-medium text-gray-900">{detail.paymentMethod}</dd>
          </div>
          <div className="flex flex-wrap items-center gap-x-2">
            <dt className="text-gray-500">Amount:</dt>
            <dd className="font-medium text-gray-900">
              {formatOrderDrawerMoney(
                detail.paymentAmount,
                detail.baseCurrency,
              )}
            </dd>
          </div>
          <div className="flex flex-wrap items-center gap-x-2">
            <dt className="text-gray-500">Status:</dt>
            <dd>
              <span
                className={`${ADMIN_BADGE} ${paymentStatusBadgeClass(detail.paymentStatus)}`}
              >
                {formatOrderStatusLabel(detail.paymentStatus)}
              </span>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
