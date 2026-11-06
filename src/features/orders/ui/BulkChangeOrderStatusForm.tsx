"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ConfirmDialog,
} from "@/components/ui/ConfirmDialog";
import {
  ADMIN_TABLE,
  ADMIN_TABLE_CARD,
  ADMIN_TABLE_CHECKBOX,
  ADMIN_TABLE_FOOTER_ROUNDED_B,
  ADMIN_TABLE_OUTER_SCROLL,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_STATE_INSET,
  ADMIN_TABLE_TBODY,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TD_CHECK,
  ADMIN_TABLE_TD_METRIC,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_TH_CHECK,
  ADMIN_TABLE_TH_METRIC,
  ADMIN_TABLE_THEAD,
} from "@/features/admin/ui/admin-table-classes";
import { bulkArchiveOrdersAction } from "@/features/orders/application/bulk-archive-orders";
import { AdminInlineStatusSelect } from "@/features/orders/ui/AdminInlineStatusSelect";

type BulkOrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  contactName: string;
  contactEmail: string;
  totalAmount: number;
  baseCurrency: string;
  placedAt: string | Date;
  isArchived: boolean;
};

type BulkChangeOrderStatusFormProps = {
  locale: string;
  orders: BulkOrderRow[];
  onOpenOrder: (orderNumber: string) => void;
};

function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString("en-US")} ${currency}`;
}

export function BulkChangeOrderStatusForm({
  locale,
  orders,
  onOpenOrder,
}: BulkChangeOrderStatusFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allNumbers = orders.map((order) => order.orderNumber);
  const allSelected =
    allNumbers.length > 0 && allNumbers.every((n) => selected.has(n));

  function toggleOne(orderNumber: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderNumber)) {
        next.delete(orderNumber);
      } else {
        next.add(orderNumber);
      }
      return next;
    });
  }

  function toggleAll(): void {
    setSelected(allSelected ? new Set() : new Set(allNumbers));
  }

  function deleteSelected(): void {
    if (selected.size === 0) {
      setError("Select at least one order.");
      return;
    }
    setConfirmOpen(true);
  }

  function confirmDelete(): void {
    const orderNumbers = [...selected];
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await bulkArchiveOrdersAction(locale, {
        orderNumbers,
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setMessage(
        `Deleted ${result.value.archived}, skipped ${result.value.skipped}.`,
      );
      setSelected(new Set());
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-gray-700">
          Selected {selected.size} order{selected.size === 1 ? "" : "s"}
        </p>
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={isPending || selected.size === 0}
          onClick={deleteSelected}
        >
          {isPending ? "Deleting…" : "Delete selected"}
        </Button>
        {error ? (
          <p className="w-full text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="w-full text-sm text-green-700">{message}</p>
        ) : null}
      </Card>

      <Card className={ADMIN_TABLE_CARD}>
        <div className={ADMIN_TABLE_OUTER_SCROLL}>
          <table className={ADMIN_TABLE}>
            <thead className={ADMIN_TABLE_THEAD}>
              <tr>
                <th className={ADMIN_TABLE_TH_CHECK}>
                  <input
                    type="checkbox"
                    className={ADMIN_TABLE_CHECKBOX}
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={isPending || orders.length === 0}
                    aria-label="Select all orders on page"
                  />
                </th>
                <th className={ADMIN_TABLE_TH}>Order</th>
                <th className={ADMIN_TABLE_TH}>Customer</th>
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
                  <td
                    className={ADMIN_TABLE_TD_CHECK}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className={ADMIN_TABLE_CHECKBOX}
                      checked={selected.has(order.orderNumber)}
                      onChange={() => toggleOne(order.orderNumber)}
                      disabled={isPending || order.isArchived}
                      aria-label={`Select ${order.orderNumber}`}
                    />
                  </td>
                  <td className={ADMIN_TABLE_TD}>
                    <span className="font-medium text-gray-900">
                      {order.orderNumber}
                    </span>
                    {order.isArchived ? (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-600">
                        Archived
                      </span>
                    ) : null}
                  </td>
                  <td className={ADMIN_TABLE_TD}>
                    <p className="text-sm text-gray-900">{order.contactName}</p>
                    <p className="text-xs text-gray-500">{order.contactEmail}</p>
                  </td>
                  <td
                    className={ADMIN_TABLE_TD_METRIC}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <AdminInlineStatusSelect
                      locale={locale}
                      orderNumber={order.orderNumber}
                      kind="order"
                      value={order.status}
                      disabled={isPending || order.isArchived}
                    />
                  </td>
                  <td
                    className={ADMIN_TABLE_TD_METRIC}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <AdminInlineStatusSelect
                      locale={locale}
                      orderNumber={order.orderNumber}
                      kind="payment"
                      value={order.paymentStatus}
                      disabled={isPending || order.isArchived}
                    />
                  </td>
                  <td className={ADMIN_TABLE_TD_METRIC}>
                    <span className="font-medium text-gray-900">
                      {formatMoney(order.totalAmount, order.baseCurrency)}
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
              {selected.size} selected on this page
            </p>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete"
        description={`Are you sure you want to delete ${selected.size} selected order${selected.size === 1 ? "" : "s"}? This action cannot be undone.`}
        isPending={isPending}
        onClose={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
