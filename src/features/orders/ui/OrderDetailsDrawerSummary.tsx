import type { ReactNode } from "react";

import {
  ADMIN_BADGE,
  orderStatusBadgeClass,
  paymentStatusBadgeClass,
} from "@/features/admin/ui/status-badge";
import type { AdminOrderDetailView } from "@/features/orders/application/order-detail-view";
import {
  formatOrderDrawerMoney,
  formatOrderStatusLabel,
} from "@/features/orders/ui/order-drawer-format";

type OrderDetailsDrawerSummaryProps = {
  detail: AdminOrderDetailView;
};

export function OrderDetailsDrawerSummary({
  detail,
}: OrderDetailsDrawerSummaryProps) {
  return (
    <div className="rounded-2xl border border-gray-200 px-5 py-4">
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h3 className="mb-4 text-base font-semibold text-gray-900">Summary</h3>
          <dl className="space-y-3 text-sm">
            <DetailRow label="Order #:" value={detail.orderNumber} />
            <DetailRow
              label="Total:"
              value={formatOrderDrawerMoney(
                detail.totalAmount,
                detail.baseCurrency,
              )}
            />
            <DetailRow
              label="Status:"
              value={
                <span
                  className={`${ADMIN_BADGE} ${orderStatusBadgeClass(detail.status)}`}
                >
                  {formatOrderStatusLabel(detail.status)}
                </span>
              }
            />
            <DetailRow
              label="Payment:"
              value={
                <span
                  className={`${ADMIN_BADGE} ${paymentStatusBadgeClass(detail.paymentStatus)}`}
                >
                  {formatOrderStatusLabel(detail.paymentStatus)}
                </span>
              }
            />
          </dl>
        </section>

        <section>
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Customer
          </h3>
          <dl className="space-y-3 text-sm">
            <DetailRow label="Name:" value={detail.contactName} />
            <DetailRow label="Phone Number:" value={detail.contactPhone} />
            <DetailRow label="Email:" value={detail.contactEmail} />
          </dl>
        </section>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
