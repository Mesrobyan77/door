"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Card } from "@/components/ui/Card";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { AdminSearchInput } from "@/features/admin/ui/AdminSearchInput";
import type { OrderStatus } from "@/features/orders/domain/order-status";
import type { PaymentStatus } from "@/features/orders/domain/payment-status";

const ORDER_STATUS_FILTERS = [
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Completed", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
] as const satisfies ReadonlyArray<{ label: string; value: OrderStatus }>;

const PAYMENT_STATUS_FILTERS = [
  { label: "Paid", value: "CAPTURED" },
  { label: "Pending", value: "PENDING" },
  { label: "Failed", value: "FAILED" },
] as const satisfies ReadonlyArray<{ label: string; value: PaymentStatus }>;

type AdminOrdersFiltersProps = {
  total: number;
  status?: OrderStatus;
  paymentStatus?: string;
  q?: string;
};

export function AdminOrdersFilters({
  total,
  status,
  paymentStatus,
  q,
}: AdminOrdersFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [statusValue, setStatusValue] = useState(status ?? "");
  const [paymentValue, setPaymentValue] = useState(paymentStatus ?? "");

  function applyStatus(next: string): void {
    flushSync(() => setStatusValue(next));
    formRef.current?.requestSubmit();
  }

  function applyPayment(next: string): void {
    flushSync(() => setPaymentValue(next));
    formRef.current?.requestSubmit();
  }

  return (
    <Card className="mb-6 overflow-visible">
      <form
        ref={formRef}
        method="get"
        className="flex flex-nowrap items-center gap-3 p-4"
      >
        <SelectDropdown
          name="status"
          ariaLabel="Order status"
          value={statusValue}
          allLabel="All statuses"
          options={ORDER_STATUS_FILTERS}
          className="w-[180px] shrink-0"
          onValueChange={applyStatus}
        />
        <SelectDropdown
          name="paymentStatus"
          ariaLabel="Payment status"
          value={paymentValue}
          allLabel="All payment statuses"
          options={PAYMENT_STATUS_FILTERS}
          className="w-[200px] shrink-0"
          onValueChange={applyPayment}
        />
        <AdminSearchInput
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by order #, customer, email, phone…"
          wrapperClassName="min-w-0 flex-1"
          aria-label="Search orders"
        />
      </form>
      <div className="border-t border-gray-200 px-4 py-3">
        <p className="text-sm text-gray-600">Total orders: {total}</p>
      </div>
    </Card>
  );
}
