"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Copy, Pencil, Plus, Trash2 } from "lucide-react";

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
import {
  deletePromotionAction,
  duplicatePromotionAction,
} from "@/features/promotions/application/upsert-promotion";
import type { AdminPromotionListItem } from "@/features/promotions/application/queries";
import { CouponDrawer } from "@/features/promotions/ui/CouponDrawer";

type AdminCouponsViewProps = {
  locale: string;
  coupons: AdminPromotionListItem[];
};

function typeLabel(discountType: string): string {
  return discountType === "PERCENTAGE" ? "Percent off" : "Fixed amount (AMD)";
}

function valueLabel(discountType: string, discountValue: number): string {
  return discountType === "PERCENTAGE"
    ? `${discountValue}%`
    : String(discountValue);
}

function formatValidUntil(
  endsAt: Date | string | null,
  locale: string,
): string {
  if (!endsAt) return "—";
  return new Date(endsAt).toLocaleString(locale);
}

export function AdminCouponsView({ locale, coupons }: AdminCouponsViewProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] =
    useState<AdminPromotionListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    code: string;
  } | null>(null);

  function openCreate(): void {
    setEditingCoupon(null);
    setDrawerOpen(true);
  }

  function openEdit(coupon: AdminPromotionListItem): void {
    setEditingCoupon(coupon);
    setDrawerOpen(true);
  }

  function closeDrawer(): void {
    setDrawerOpen(false);
    setEditingCoupon(null);
  }

  function runAction(action: () => Promise<void>): void {
    startTransition(async () => {
      setError(null);
      try {
        await action();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Action failed.");
      }
    });
  }

  function confirmDelete(): void {
    if (!pendingDelete) return;
    const promoId = pendingDelete.id;
    startTransition(async () => {
      setError(null);
      try {
        const result = await deletePromotionAction(locale, promoId);
        if (!result.ok) {
          throw new Error(result.error.message);
        }
        setPendingDelete(null);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Action failed.");
      }
    });
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Promo codes</h1>
          <p className={`mt-1 ${ADMIN_PAGE_SUBTITLE}`}>
            Create, edit, or remove discount codes for checkout.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Promo Code
        </Button>
      </div>

      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      <Card className={ADMIN_TABLE_CARD}>
        {coupons.length === 0 ? (
          <p className={`${ADMIN_TABLE_STATE_INSET} text-sm text-gray-600`}>
            No promo codes yet.
          </p>
        ) : (
          <div className={ADMIN_TABLE_OUTER_SCROLL}>
            <table className={ADMIN_TABLE}>
              <thead className={ADMIN_TABLE_THEAD}>
                <tr>
                  <th className={ADMIN_TABLE_TH}>Code</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Type</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Value</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Usage limit</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Used</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Active</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Valid until</th>
                  <th className={ADMIN_TABLE_TH_CENTER}>Actions</th>
                </tr>
              </thead>
              <tbody className={ADMIN_TABLE_TBODY}>
                {coupons.map((promo) => (
                  <tr key={promo.id} className={ADMIN_TABLE_ROW}>
                    <td className={ADMIN_TABLE_TD}>
                      <span className="font-medium text-gray-900">
                        {promo.code}
                      </span>
                    </td>
                    <td className={ADMIN_TABLE_TD_CENTER}>
                      {typeLabel(promo.discountType)}
                    </td>
                    <td className={ADMIN_TABLE_TD_CENTER}>
                      {valueLabel(promo.discountType, promo.discountValue)}
                    </td>
                    <td className={ADMIN_TABLE_TD_CENTER}>
                      {promo.totalUsageLimit ?? "—"}
                    </td>
                    <td className={ADMIN_TABLE_TD_CENTER}>{promo.usedCount}</td>
                    <td className={ADMIN_TABLE_TD_CENTER}>
                      {promo.isActive ? (
                        <Check
                          className="mx-auto h-4 w-4 text-gray-900"
                          aria-label="Active"
                        />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className={ADMIN_TABLE_TD_CENTER}>
                      <span className="text-sm text-gray-700">
                        {formatValidUntil(promo.endsAt, locale)}
                      </span>
                    </td>
                    <td className={ADMIN_TABLE_TD_CENTER}>
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          aria-label={`Edit ${promo.code}`}
                          onClick={() => openEdit(promo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          aria-label={`Duplicate ${promo.code}`}
                          onClick={() =>
                            runAction(async () => {
                              const result = await duplicatePromotionAction(
                                locale,
                                promo.id,
                              );
                              if (!result.ok) {
                                throw new Error(result.error.message);
                              }
                            })
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50"
                          aria-label={`Delete ${promo.code}`}
                          onClick={() =>
                            setPendingDelete({
                              id: promo.id,
                              code: promo.code ?? "promo",
                            })
                          }
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

      <CouponDrawer
        locale={locale}
        open={drawerOpen}
        onClose={closeDrawer}
        coupon={editingCoupon}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete"
        description={
          pendingDelete
            ? deleteConfirmDescription("promo code", pendingDelete.code)
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
