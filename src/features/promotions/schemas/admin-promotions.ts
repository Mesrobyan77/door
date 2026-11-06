import { z } from "zod";

import {
  DISCOUNT_TYPES,
  PROMOTION_KINDS,
} from "@/features/promotions/domain/promotion-rules";

function emptyToNull(value: unknown): unknown {
  if (value === "" || value === undefined) {
    return null;
  }
  return value;
}

export const adminPromotionsFilterSchema = z.object({
  kind: z.enum(PROMOTION_KINDS).optional(),
  q: z.string().trim().max(64).optional(),
  active: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type AdminPromotionsFilter = z.infer<typeof adminPromotionsFilterSchema>;

export const upsertPromotionSchema = z.object({
  kind: z.enum(PROMOTION_KINDS),
  code: z.preprocess(emptyToNull, z.string().trim().max(64).nullable()),
  productId: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  categoryId: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: z.coerce.number().int().positive(),
  maxDiscountAmount: z.preprocess(
    emptyToNull,
    z.coerce.number().int().positive().nullable(),
  ),
  minimumOrderAmount: z.preprocess(
    emptyToNull,
    z.coerce.number().int().nonnegative().nullable(),
  ),
  totalUsageLimit: z.preprocess(
    emptyToNull,
    z.coerce.number().int().positive().nullable(),
  ),
  perUserUsageLimit: z.preprocess(
    emptyToNull,
    z.coerce.number().int().positive().nullable(),
  ),
  priority: z.coerce.number().int().min(0).max(10_000).default(0),
  allowStacking: z.preprocess(
    (value) => value === true || value === "on" || value === "true",
    z.boolean(),
  ),
  isActive: z.preprocess((value) => {
    if (value === false || value === "false") {
      return false;
    }
    return true;
  }, z.boolean()),
  startsAt: z.preprocess(emptyToNull, z.coerce.date().nullable()),
  endsAt: z.preprocess(emptyToNull, z.coerce.date().nullable()),
});

export type UpsertPromotionInput = z.infer<typeof upsertPromotionSchema>;

export const togglePromotionSchema = z.object({
  promotionId: z.string().uuid(),
  isActive: z.boolean(),
});

export type TogglePromotionInput = z.infer<typeof togglePromotionSchema>;
