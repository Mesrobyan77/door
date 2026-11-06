"use client";

import { Card } from "@/components/ui/Card";
import {
  ADMIN_BADGE,
  orderStatusBadgeClass,
  paymentStatusBadgeClass,
} from "@/features/admin/ui/status-badge";
import {
  ADMIN_TABLE,
  ADMIN_TABLE_CARD,
  ADMIN_TABLE_FOOTER_ROUNDED_B,
  ADMIN_TABLE_OUTER_SCROLL,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_STATE_INSET,
  ADMIN_TABLE_TBODY,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TD_METRIC,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_TH_METRIC,
  ADMIN_TABLE_THEAD,
} from "@/features/admin/ui/admin-table-classes";
import {
  formatOrderDrawerMoney,
  formatOrderStatusLabel,
} from "@/features/orders/ui/order-drawer-format";

type CustomerOrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  baseCurrency: string;
  placedAt: string | Date;
};

type CustomerOrdersTableProps = {
  orders: CustomerOrderRow[];
  onOpenOrder: (orderNumber: string) => void;
};

export function CustomerOrdersTable({
  orders,
  onOpenOrder,
}: CustomerOrdersTableProps) {
  return (
    <Card className={ADMIN_TABLE_CARD}>
      <div className={ADMIN_TABLE_OUTER_SCROLL}>
        <table className={ADMIN_TABLE}>
          <thead className={ADMIN_TABLE_THEAD}>
            <tr>
              <th className={ADMIN_TABLE_TH}>Order</th>
              <th className={ADMIN_TABLE_TH_METRIC}>Status</th>
              <th className={ADMIN_TABLE_TH_METRIC}>Payment</th>
              <th className={ADMIN_TABLE_TH_METRIC}>Total</th>
              <th className={ADMIN_TABLE_TH}>Placed</th>
            </tr>
          </thead>
          <tbody className={ADMIN_TABLE_TBODY}>
            {orders.map((order) => (
              <tr
                key={order.id}
                className={`${ADMIN_TABLE_ROW} cursor-pointer`}
                tabIndex={0}
                role="button"
                aria-label={`Open order ${order.orderNumber}`}
                onClick={() => onOpenOrder(order.orderNumber)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenOrder(order.orderNumber);
                  }
                }}
              >
                <td className={`${ADMIN_TABLE_TD} font-medium text-gray-900`}>
                  {order.orderNumber}
                </td>
                <td className={ADMIN_TABLE_TD_METRIC}>
                  <span
                    className={`${ADMIN_BADGE} ${orderStatusBadgeClass(order.status)}`}
                  >
                    {formatOrderStatusLabel(order.status)}
                  </span>
                </td>
                <td className={ADMIN_TABLE_TD_METRIC}>
                  <span
                    className={`${ADMIN_BADGE} ${paymentStatusBadgeClass(order.paymentStatus)}`}
                  >
                    {formatOrderStatusLabel(order.paymentStatus)}
                  </span>
                </td>
                <td className={ADMIN_TABLE_TD_METRIC}>
                  <span className="font-medium text-gray-900">
                    {formatOrderDrawerMoney(
                      order.totalAmount,
                      order.baseCurrency,
                    )}
                  </span>
                </td>
                <td className={ADMIN_TABLE_TD}>
                  <span className="text-xs text-gray-500">
                    {new Date(order.placedAt)
                      .toISOString()
                      .slice(0, 16)
                      .replace("T", " ")}{" "}
                    UTC
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders.length === 0 ? (
        <p className={`${ADMIN_TABLE_STATE_INSET} text-sm text-gray-600`}>
          No orders match these filters.
        </p>
      ) : (
        <div className={ADMIN_TABLE_FOOTER_ROUNDED_B}>
          <p className="text-sm text-gray-600">
            {orders.length} order{orders.length === 1 ? "" : "s"} on this page
          </p>
        </div>
      )}
    </Card>
  );
}
