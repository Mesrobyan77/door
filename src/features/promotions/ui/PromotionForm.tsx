"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_SECTION_TITLE,
  ADMIN_SELECT,
} from "@/features/admin/ui/admin-form-classes";
import {
  createPromotionAction,
  updatePromotionAction,
} from "@/features/promotions/application/upsert-promotion";
import type {
  DiscountType,
  PromotionKind,
} from "@/features/promotions/domain/promotion-rules";
import type { UpsertPromotionInput } from "@/features/promotions/schemas/admin-promotions";

type TargetOptions = {
  products: Array<{ id: string; sku: string; title: string }>;
  categories: Array<{ id: string; title: string }>;
};

type PromotionFormProps = {
  locale: string;
  mode: "create" | "edit";
  promotionId?: string;
  initialKind: PromotionKind;
  lockKind?: boolean;
  defaults?: Partial<{
    code: string | null;
    productId: string | null;
    categoryId: string | null;
    discountType: DiscountType;
    discountValue: number;
    maxDiscountAmount: number | null;
    minimumOrderAmount: number | null;
    totalUsageLimit: number | null;
    perUserUsageLimit: number | null;
    priority: number;
    allowStacking: boolean;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  }>;
  targets: TargetOptions;
  redirectTo: string;
};

function toDateInput(value: Date | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.toISOString().slice(0, 16);
}

export function PromotionForm({
  locale,
  mode,
  promotionId,
  initialKind,
  lockKind = false,
  defaults,
  targets,
  redirectTo,
}: PromotionFormProps) {
  const router = useRouter();
  const [kind, setKind] = useState<PromotionKind>(initialKind);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const title = useMemo(() => {
    if (mode === "edit") {
      return "Edit promotion";
    }
    return kind === "COUPON" ? "Create coupon" : "Create automatic discount";
  }, [kind, mode]);

  return (
    <Card className="max-w-xl p-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const payload: UpsertPromotionInput = {
            kind: String(formData.get("kind") ?? kind) as PromotionKind,
            code: String(formData.get("code") ?? "") || null,
            productId: String(formData.get("productId") ?? "") || null,
            categoryId: String(formData.get("categoryId") ?? "") || null,
            discountType: String(formData.get("discountType")) as DiscountType,
            discountValue: Number(formData.get("discountValue")),
            maxDiscountAmount: String(formData.get("maxDiscountAmount") ?? "")
              ? Number(formData.get("maxDiscountAmount"))
              : null,
            minimumOrderAmount: String(formData.get("minimumOrderAmount") ?? "")
              ? Number(formData.get("minimumOrderAmount"))
              : null,
            totalUsageLimit: String(formData.get("totalUsageLimit") ?? "")
              ? Number(formData.get("totalUsageLimit"))
              : null,
            perUserUsageLimit: String(formData.get("perUserUsageLimit") ?? "")
              ? Number(formData.get("perUserUsageLimit"))
              : null,
            priority: Number(formData.get("priority") ?? 0),
            allowStacking: formData.get("allowStacking") === "on",
            isActive: formData.get("isActive") === "on",
            startsAt: String(formData.get("startsAt") ?? "")
              ? new Date(String(formData.get("startsAt")))
              : null,
            endsAt: String(formData.get("endsAt") ?? "")
              ? new Date(String(formData.get("endsAt")))
              : null,
          };

          startTransition(async () => {
            setError(null);
            const result =
              mode === "edit" && promotionId
                ? await updatePromotionAction(locale, promotionId, payload)
                : await createPromotionAction(locale, payload);

            if (!result.ok) {
              setError(result.error.message);
              return;
            }

            router.push(redirectTo);
            router.refresh();
          });
        }}
      >
        <h2 className={ADMIN_SECTION_TITLE}>{title}</h2>

        <label>
          <span className={ADMIN_LABEL}>Kind</span>
          <select
            name="kind"
            className={ADMIN_SELECT}
            value={kind}
            disabled={lockKind || isPending}
            onChange={(event) => setKind(event.target.value as PromotionKind)}
          >
            <option value="COUPON">COUPON</option>
            <option value="AUTOMATIC">AUTOMATIC</option>
          </select>
        </label>

        {kind === "COUPON" ? (
          <label>
            <span className={ADMIN_LABEL}>Code</span>
            <input
              name="code"
              required
              defaultValue={defaults?.code ?? ""}
              className={`${ADMIN_INPUT} uppercase`}
              placeholder="WELCOME10"
              disabled={isPending}
            />
          </label>
        ) : (
          <>
            <label>
              <span className={ADMIN_LABEL}>Product target</span>
              <select
                name="productId"
                className={ADMIN_SELECT}
                defaultValue={defaults?.productId ?? ""}
                disabled={isPending}
              >
                <option value="">— none —</option>
                {targets.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} · {product.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={ADMIN_LABEL}>Category target</span>
              <select
                name="categoryId"
                className={ADMIN_SELECT}
                defaultValue={defaults?.categoryId ?? ""}
                disabled={isPending}
              >
                <option value="">— none —</option>
                {targets.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-gray-500">
              Choose exactly one target: product or category.
            </p>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={ADMIN_LABEL}>Discount type</span>
            <select
              name="discountType"
              className={ADMIN_SELECT}
              defaultValue={defaults?.discountType ?? "PERCENTAGE"}
              disabled={isPending}
            >
              <option value="PERCENTAGE">PERCENTAGE</option>
              <option value="FIXED">FIXED (AMD minor units)</option>
            </select>
          </label>
          <label>
            <span className={ADMIN_LABEL}>Discount value</span>
            <input
              name="discountValue"
              type="number"
              required
              min={1}
              defaultValue={defaults?.discountValue ?? 10}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={ADMIN_LABEL}>Max discount (optional)</span>
            <input
              name="maxDiscountAmount"
              type="number"
              min={1}
              defaultValue={defaults?.maxDiscountAmount ?? ""}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>Min order (optional)</span>
            <input
              name="minimumOrderAmount"
              type="number"
              min={0}
              defaultValue={defaults?.minimumOrderAmount ?? ""}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={ADMIN_LABEL}>Total usage limit</span>
            <input
              name="totalUsageLimit"
              type="number"
              min={1}
              defaultValue={defaults?.totalUsageLimit ?? ""}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>Per-user limit</span>
            <input
              name="perUserUsageLimit"
              type="number"
              min={1}
              defaultValue={defaults?.perUserUsageLimit ?? ""}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={ADMIN_LABEL}>Starts at</span>
            <input
              name="startsAt"
              type="datetime-local"
              defaultValue={toDateInput(defaults?.startsAt)}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
          <label>
            <span className={ADMIN_LABEL}>Ends at</span>
            <input
              name="endsAt"
              type="datetime-local"
              defaultValue={toDateInput(defaults?.endsAt)}
              className={ADMIN_INPUT}
              disabled={isPending}
            />
          </label>
        </div>

        <label>
          <span className={ADMIN_LABEL}>Priority</span>
          <input
            name="priority"
            type="number"
            min={0}
            defaultValue={defaults?.priority ?? 0}
            className={ADMIN_INPUT}
            disabled={isPending}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="allowStacking"
            defaultChecked={defaults?.allowStacking ?? false}
            disabled={isPending}
            className="h-4 w-4 rounded border-gray-300"
          />
          Allow stacking
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaults?.isActive ?? true}
            disabled={isPending}
            className="h-4 w-4 rounded border-gray-300"
          />
          Active
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : mode === "edit" ? "Save changes" : "Create"}
        </Button>
      </form>
    </Card>
  );
}
