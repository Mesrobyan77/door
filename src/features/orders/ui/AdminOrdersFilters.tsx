'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { Card } from '@/components/ui/Card';
import { SelectDropdown } from '@/components/ui/SelectDropdown';
import { AdminSearchInput } from '@/features/admin/ui/AdminSearchInput';
import { useAdminDictionary } from '@/features/admin/ui/AdminI18nContext';
import type { OrderStatus } from '@/features/orders/domain/order-status';
import type { PaymentStatus } from '@/features/orders/domain/payment-status';

type AdminOrdersFiltersProps = {
  total: number;
  status?: OrderStatus;
  paymentStatus?: string;
  q?: string;
};

export function AdminOrdersFilters({ total, status, paymentStatus, q }: AdminOrdersFiltersProps) {
  const { orders: copy } = useAdminDictionary();
  const formRef = useRef<HTMLFormElement>(null);
  const [statusValue, setStatusValue] = useState(status ?? '');
  const [paymentValue, setPaymentValue] = useState(paymentStatus ?? '');
  const orderStatusFilters = [
    { label: copy.pending, value: 'PENDING' },
    { label: copy.processing, value: 'PROCESSING' },
    { label: copy.completed, value: 'DELIVERED' },
    { label: copy.cancelled, value: 'CANCELLED' },
  ] satisfies ReadonlyArray<{ label: string; value: OrderStatus }>;
  const paymentStatusFilters = [
    { label: copy.paid, value: 'CAPTURED' },
    { label: copy.pending, value: 'PENDING' },
    { label: copy.failed, value: 'FAILED' },
  ] satisfies ReadonlyArray<{ label: string; value: PaymentStatus }>;

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
      <form ref={formRef} method="get" className="flex flex-nowrap items-center gap-3 p-4">
        <SelectDropdown
          name="status"
          ariaLabel={copy.orderStatus}
          value={statusValue}
          allLabel={copy.allStatuses}
          options={orderStatusFilters}
          className="w-[180px] shrink-0"
          onValueChange={applyStatus}
        />
        <SelectDropdown
          name="paymentStatus"
          ariaLabel={copy.paymentStatus}
          value={paymentValue}
          allLabel={copy.allPaymentStatuses}
          options={paymentStatusFilters}
          className="w-[200px] shrink-0"
          onValueChange={applyPayment}
        />
        <AdminSearchInput
          name="q"
          defaultValue={q ?? ''}
          placeholder={copy.searchPlaceholder}
          wrapperClassName="min-w-0 flex-1"
          aria-label={copy.searchPlaceholder}
        />
      </form>
      <div className="border-t border-gray-200 px-4 py-3">
        <p className="text-sm text-gray-600">
          {copy.total}: {total}
        </p>
      </div>
    </Card>
  );
}
