"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ConfirmDialog,
} from "@/components/ui/ConfirmDialog";
import { ADMIN_SECTION_TITLE } from "@/features/admin/ui/admin-form-classes";
import { archiveOrderAction } from "@/features/orders/application/archive-order";

type ArchiveOrderButtonProps = {
  locale: string;
  orderNumber: string;
  isArchived: boolean;
};

export function ArchiveOrderButton({
  locale,
  orderNumber,
  isArchived,
}: ArchiveOrderButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function runArchive(archive: boolean): void {
    startTransition(async () => {
      setError(null);
      const result = await archiveOrderAction(locale, {
        orderNumber,
        archive,
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3">
        <h2 className={ADMIN_SECTION_TITLE}>Archive</h2>
        <p className="text-sm text-gray-600">
          {isArchived
            ? "This order is archived. Restore it to show in default lists."
            : "Archive hides the order from default admin lists without deleting data."}
        </p>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => {
            if (isArchived) {
              runArchive(false);
              return;
            }
            setConfirmOpen(true);
          }}
        >
          {isPending
            ? "Saving…"
            : isArchived
              ? "Restore order"
              : "Archive order"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Archive"
        description={`Are you sure you want to archive order "${orderNumber}"? It will be hidden from default admin lists.`}
        confirmLabel="Archive"
        isPending={isPending}
        onClose={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        onConfirm={() => runArchive(true)}
      />
    </Card>
  );
}
