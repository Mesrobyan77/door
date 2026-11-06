"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import {
  ADMIN_LABEL,
  ADMIN_TEXTAREA,
} from "@/features/admin/ui/admin-form-classes";
import { changePaymentStatusAction } from "@/features/orders/application/change-payment-status";
import type { PaymentStatus } from "@/features/orders/domain/payment-status";

type ChangePaymentStatusFormProps = {
  locale: string;
  orderNumber: string;
  currentStatus: PaymentStatus;
  eligibleStatuses: PaymentStatus[];
};

export function ChangePaymentStatusForm({
  locale,
  orderNumber,
  currentStatus,
  eligibleStatuses,
}: ChangePaymentStatusFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [toStatus, setToStatus] = useState(eligibleStatuses[0] ?? "");
  const [isPending, startTransition] = useTransition();

  if (eligibleStatuses.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Terminal payment status — no further transitions.
      </p>
    );
  }

  return (
    <Card className="p-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const noteRaw = String(formData.get("note") ?? "").trim();

          startTransition(async () => {
            setError(null);
            const result = await changePaymentStatusAction(locale, {
              orderNumber,
              toStatus: toStatus as PaymentStatus,
              note: noteRaw.length > 0 ? noteRaw : undefined,
            });

            if (!result.ok) {
              setError(result.error.message);
              return;
            }

            router.refresh();
          });
        }}
      >
        <p className="text-sm text-gray-700">
          Current: <strong className="text-gray-900">{currentStatus}</strong>
        </p>
        <div>
          <span className={ADMIN_LABEL}>New payment status</span>
          <SelectDropdown
            name="toStatus"
            ariaLabel="New payment status"
            value={toStatus}
            options={eligibleStatuses.map((status) => ({
              label: status,
              value: status,
            }))}
            disabled={isPending}
            deferChange={false}
            className="mt-1"
            onValueChange={setToStatus}
          />
        </div>
        <label>
          <span className={ADMIN_LABEL}>Note (optional)</span>
          <textarea
            name="note"
            rows={2}
            maxLength={1000}
            className={ADMIN_TEXTAREA}
            disabled={isPending}
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Updating…" : "Update payment"}
        </Button>
      </form>
    </Card>
  );
}
