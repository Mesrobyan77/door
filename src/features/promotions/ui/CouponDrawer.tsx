"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { SideSheet } from "@/components/ui/SideSheet";
import {
  ADMIN_INPUT,
  ADMIN_LABEL,
} from "@/features/admin/ui/admin-form-classes";
import {
  createPromotionAction,
  updatePromotionAction,
} from "@/features/promotions/application/upsert-promotion";
import type { AdminPromotionListItem } from "@/features/promotions/application/queries";
import type { DiscountType } from "@/features/promotions/domain/promotion-rules";

type CouponDrawerCoupon = Pick<
  AdminPromotionListItem,
  | "id"
  | "code"
  | "discountType"
  | "discountValue"
  | "totalUsageLimit"
  | "endsAt"
  | "isActive"
>;

type CouponDrawerProps = {
  locale: string;
  open: boolean;
  onClose: () => void;
  coupon?: CouponDrawerCoupon | null;
};

function toDateTimeLocal(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export function CouponDrawer({
  locale,
  open,
  onClose,
  coupon = null,
}: CouponDrawerProps) {
  const router = useRouter();
  const isEdit = coupon != null;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] =
    useState<DiscountType>("PERCENTAGE");
  const [value, setValue] = useState("10");
  const [quantity, setQuantity] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevCoupon, setPrevCoupon] = useState(coupon);

  if (open !== prevOpen || coupon !== prevCoupon) {
    setPrevOpen(open);
    setPrevCoupon(coupon);
    if (open) {
      if (coupon) {
        setName(coupon.code ?? "");
        setCode(coupon.code ?? "");
        setDiscountType(
          coupon.discountType === "FIXED" ? "FIXED" : "PERCENTAGE",
        );
        setValue(String(coupon.discountValue));
        setQuantity(
          coupon.totalUsageLimit != null
            ? String(coupon.totalUsageLimit)
            : "",
        );
        setExpiresAt(toDateTimeLocal(coupon.endsAt));
        setError(null);
      } else {
        setName("");
        setCode("");
        setDiscountType("PERCENTAGE");
        setValue("10");
        setQuantity("1");
        setExpiresAt("");
        setError(null);
      }
    }
  }

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      ariaLabel={isEdit ? "Edit coupon" : "New coupon"}
      panelClassName="w-full max-w-md"
    >
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit coupon" : "New coupon"}
          </h2>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            const nextCode = (code.trim() || name.trim()).toUpperCase();
            if (!nextCode) {
              setError("Code is required.");
              return;
            }

            const payload = {
              kind: "COUPON" as const,
              code: nextCode,
              productId: null,
              categoryId: null,
              discountType,
              discountValue: Number(value),
              maxDiscountAmount: null,
              minimumOrderAmount: null,
              totalUsageLimit: quantity ? Number(quantity) : null,
              perUserUsageLimit: null,
              priority: 0,
              allowStacking: false,
              isActive: coupon?.isActive ?? true,
              startsAt: null,
              endsAt: expiresAt ? new Date(expiresAt) : null,
            };

            startTransition(async () => {
              setError(null);
              const result =
                isEdit && coupon
                  ? await updatePromotionAction(locale, coupon.id, payload)
                  : await createPromotionAction(locale, payload);

              if (!result.ok) {
                setError(result.error.message);
                return;
              }

              onClose();
              router.refresh();
            });
          }}
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={ADMIN_LABEL}>Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Name"
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>Code</span>
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase())
                  }
                  placeholder="Code"
                  className={`${ADMIN_INPUT} uppercase`}
                  disabled={isPending}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={ADMIN_LABEL}>Discount type</span>
                <SelectDropdown
                  ariaLabel="Discount type"
                  value={discountType}
                  options={[
                    { label: "Percent off", value: "PERCENTAGE" },
                    { label: "Fixed amount (AMD)", value: "FIXED" },
                  ]}
                  disabled={isPending}
                  deferChange={false}
                  className="mt-1"
                  onValueChange={(next) =>
                    setDiscountType(next as DiscountType)
                  }
                />
              </div>
              <label>
                <span className={ADMIN_LABEL}>Value</span>
                <input
                  type="number"
                  min={1}
                  required
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={ADMIN_LABEL}>Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
              <label>
                <span className={ADMIN_LABEL}>Expires (optional)</span>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className={ADMIN_INPUT}
                  disabled={isPending}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-gray-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Select users
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    All users can use this coupon
                  </p>
                </div>
                <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
              </div>
            </div>

            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </div>

          <div className="flex items-center gap-4 border-t border-gray-200 px-5 py-4">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save"
                  : "Create"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </form>
    </SideSheet>
  );
}
