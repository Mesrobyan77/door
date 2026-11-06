"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ConfirmDialog,
  deleteConfirmDescription,
} from "@/components/ui/ConfirmDialog";
import {
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
} from "@/features/admin/ui/admin-form-classes";
import {
  ADMIN_TABLE,
  ADMIN_TABLE_CARD,
  ADMIN_TABLE_OUTER_SCROLL,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_STATE_INSET,
  ADMIN_TABLE_TBODY,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TD_CENTER,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_TH_CENTER,
  ADMIN_TABLE_THEAD,
} from "@/features/admin/ui/admin-table-classes";
import { deleteDeliveryLocationAction } from "@/features/delivery/application/manage-delivery";
import type { AdminDeliveryLocation } from "@/features/delivery/application/queries";
import { DeliveryLocationDrawer } from "@/features/delivery/ui/DeliveryLocationDrawer";
import { formatMoneyAmount } from "@/lib/money/format";

type AdminDeliveryViewProps = {
  locale: string;
  locations: AdminDeliveryLocation[];
};

export function AdminDeliveryView({
  locale,
  locations,
}: AdminDeliveryViewProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<AdminDeliveryLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] =
    useState<AdminDeliveryLocation | null>(null);

  function openCreate(): void {
    setEditingLocation(null);
    setDrawerOpen(true);
  }

  function openEdit(location: AdminDeliveryLocation): void {
    setEditingLocation(location);
    setDrawerOpen(true);
  }

  function closeDrawer(): void {
    setDrawerOpen(false);
    setEditingLocation(null);
  }

  function requestDelete(location: AdminDeliveryLocation): void {
    setPendingDelete(location);
  }

  function confirmDelete(): void {
    if (!pendingDelete) return;
    const locationId = pendingDelete.id;

    startTransition(async () => {
      setError(null);
      const result = await deleteDeliveryLocationAction(locale, locationId);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setPendingDelete(null);
      router.refresh();
    });
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Delivery</h1>
          <p className={`mt-1 ${ADMIN_PAGE_SUBTITLE}`}>
            Set delivery prices by country and city for checkout.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Location
        </Button>
      </div>

      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      <Card className={ADMIN_TABLE_CARD}>
        {locations.length === 0 ? (
          <p className={`${ADMIN_TABLE_STATE_INSET} text-sm text-gray-600`}>
            No delivery locations yet. Add a location to offer delivery at
            checkout.
          </p>
        ) : (
          <div className={ADMIN_TABLE_OUTER_SCROLL}>
            <table className={ADMIN_TABLE}>
              <thead className={ADMIN_TABLE_THEAD}>
                <tr>
                  <th className={ADMIN_TABLE_TH}>Country</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>City</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Price</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Free from</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Actions</th>
                </tr>
              </thead>
              <tbody className={ADMIN_TABLE_TBODY}>
                {locations.map((location) => (
                  <tr key={location.id} className={ADMIN_TABLE_ROW}>
                    <td className={ADMIN_TABLE_TD}>{location.country}</td>
                    <td className={ADMIN_TABLE_TD_CENTER}>
                      <span className="font-medium text-gray-900">
                        {location.city}
                      </span>
                    </td>
                    <td className={ADMIN_TABLE_TD_CENTER}>
                      {formatMoneyAmount(location.priceAmount, "AMD", locale)}
                    </td>
                    <td className={ADMIN_TABLE_TD_CENTER}>
                      {location.freeThresholdAmount != null
                        ? formatMoneyAmount(
                            location.freeThresholdAmount,
                            "AMD",
                            locale,
                          )
                        : "—"}
                    </td>
                    <td className={ADMIN_TABLE_TD_CENTER}>
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(location)}
                          disabled={isPending}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          aria-label={`Edit ${location.city}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(location)}
                          disabled={isPending}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete ${location.city}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DeliveryLocationDrawer
        locale={locale}
        open={drawerOpen}
        onClose={closeDrawer}
        location={editingLocation}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete"
        description={
          pendingDelete
            ? deleteConfirmDescription("delivery location", pendingDelete.city)
            : ""
        }
        isPending={isPending}
        onClose={() => {
          if (!isPending) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
