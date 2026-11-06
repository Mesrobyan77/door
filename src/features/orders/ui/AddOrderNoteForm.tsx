"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ADMIN_LABEL,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXTAREA,
} from "@/features/admin/ui/admin-form-classes";
import { addOrderNoteAction } from "@/features/orders/application/add-order-note";

type AddOrderNoteFormProps = {
  locale: string;
  orderNumber: string;
};

export function AddOrderNoteForm({ locale, orderNumber }: AddOrderNoteFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="p-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const note = String(formData.get("note") ?? "").trim();

          startTransition(async () => {
            setError(null);
            const result = await addOrderNoteAction(locale, {
              orderNumber,
              note,
            });

            if (!result.ok) {
              setError(result.error.message);
              return;
            }

            event.currentTarget.reset();
            router.refresh();
          });
        }}
      >
        <h2 className={ADMIN_SECTION_TITLE}>Add internal note</h2>
        <label>
          <span className={ADMIN_LABEL}>Note</span>
          <textarea
            name="note"
            rows={3}
            maxLength={1000}
            required
            className={ADMIN_TEXTAREA}
            disabled={isPending}
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Add note"}
        </Button>
      </form>
    </Card>
  );
}
