"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import { promotions } from "@/db/schema";
import { getCartWithItems } from "@/features/cart/cart";
import {
  couponDiscountErrorMessage,
  evaluateCouponDiscount,
} from "@/features/promotions/domain/evaluate-coupon";
import { normalizePromotionCode } from "@/features/promotions/domain/promotion-rules";
import { resolveProductPrices } from "@/features/promotions/application/resolve-product-prices";

const previewCouponSchema = z.object({
  couponCode: z.string().trim().min(1).max(64),
});

export type PreviewCouponResult =
  | { ok: true; code: string; discountAmount: number }
  | { ok: false; error: string };

/** Validates a coupon against the current cart subtotal without consuming usage. */
export async function previewCouponAction(
  raw: z.infer<typeof previewCouponSchema>,
): Promise<PreviewCouponResult> {
  const parsed = previewCouponSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Enter a coupon code." };
  }

  const code = normalizePromotionCode(parsed.data.couponCode);
  if (!code) {
    return { ok: false, error: "Enter a coupon code." };
  }

  const { items } = await getCartWithItems();
  if (items.length === 0) {
    return { ok: false, error: "Cart is empty." };
  }

  const prices = await resolveProductPrices(
    items.map(({ product }) => ({
      id: product.id,
      priceAmount: product.priceAmount,
      compareAtAmount: product.compareAtAmount,
    })),
  );
  const subtotal = items.reduce((sum, { item, product }) => {
    const unit = prices.get(product.id)?.unitAmount ?? product.priceAmount;
    return sum + item.quantity * unit;
  }, 0);

  const [coupon] = await getDb()
    .select()
    .from(promotions)
    .where(and(eq(promotions.kind, "COUPON"), eq(promotions.code, code)))
    .limit(1);

  const evaluated = evaluateCouponDiscount(coupon, subtotal);
  if (!evaluated.ok) {
    return { ok: false, error: couponDiscountErrorMessage(evaluated.error) };
  }

  return {
    ok: true,
    code,
    discountAmount: evaluated.discountAmount,
  };
}
