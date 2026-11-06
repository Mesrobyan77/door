"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditLogs, promotions } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { upsertStoreSettingAction } from "@/features/settings/application/upsert-settings";
import { requireAdmin } from "@/lib/auth/policies";
import { invalidateProductsCache } from "@/lib/cache/invalidate-public";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

const nullablePercentSchema = z.number().int().min(1).max(100).nullable();

const targetDiscountSchema = z.object({
  target: z.enum(["product", "category"]),
  targetId: z.string().uuid(),
  percentage: nullablePercentSchema,
});

const categoryBatchSchema = z.object({
  items: z
    .array(
      z.object({
        categoryId: z.string().uuid(),
        percentage: nullablePercentSchema,
      }),
    )
    .max(500),
});

function revalidateDiscounts(locale: string): void {
  revalidatePath(`/${locale}/admin/discounts`);
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/products`);
  revalidatePath(`/${locale}/cart`);
  revalidatePath(`/${locale}/checkout`);
  invalidateProductsCache({ allProductDetails: true });
}

/** Persists the store-wide percentage discount (null clears it). */
export async function setGlobalDiscountAction(
  locale: string,
  percentage: number | null,
): Promise<Result<{ percentage: number | null }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = nullablePercentSchema.safeParse(percentage);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Percentage must be 1–100 or empty.");
  }

  const result = await upsertStoreSettingAction(locale, {
    key: "store.globalDiscount",
    value: { percentage: parsed.data },
  });

  if (!result.ok) {
    return result;
  }

  revalidateDiscounts(locale);
  revalidatePath(`/${locale}/admin/settings`);
  return ok({ percentage: parsed.data });
}

/** Creates, updates, or clears one product/category percentage discount. */
export async function upsertTargetDiscountAction(
  locale: string,
  raw: z.infer<typeof targetDiscountSchema>,
): Promise<Result<{ targetId: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = targetDiscountSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid discount payload.");
  }

  const actor = await requireAdmin(locale as Locale);
  const { target, targetId, percentage } = parsed.data;

  try {
    await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(promotions)
        .where(
          and(
            eq(promotions.kind, "AUTOMATIC"),
            eq(promotions.discountType, "PERCENTAGE"),
            target === "product"
              ? eq(promotions.productId, targetId)
              : eq(promotions.categoryId, targetId),
          ),
        )
        .limit(1);

      const now = new Date();
      const correlationId = createId();

      if (percentage === null) {
        if (!existing) return;
        await tx.delete(promotions).where(eq(promotions.id, existing.id));
        await tx.insert(auditLogs).values({
          id: createId(),
          actorUserId: actor.id,
          action: "promotion.delete",
          targetType: "promotion",
          targetId: existing.id,
          beforeDiff: {
            kind: existing.kind,
            discountValue: existing.discountValue,
          },
          correlationId,
        });
        return;
      }

      if (existing) {
        await tx
          .update(promotions)
          .set({
            discountType: "PERCENTAGE",
            discountValue: percentage,
            isActive: true,
            updatedAt: now,
          })
          .where(eq(promotions.id, existing.id));

        await tx.insert(auditLogs).values({
          id: createId(),
          actorUserId: actor.id,
          action: "promotion.update",
          targetType: "promotion",
          targetId: existing.id,
          beforeDiff: { discountValue: existing.discountValue },
          afterDiff: { discountValue: percentage },
          correlationId,
        });
        return;
      }

      const id = createId();
      await tx.insert(promotions).values({
        id,
        kind: "AUTOMATIC",
        code: null,
        productId: target === "product" ? targetId : null,
        categoryId: target === "category" ? targetId : null,
        discountType: "PERCENTAGE",
        discountValue: percentage,
        isActive: true,
        priority: target === "product" ? 10 : 5,
        allowStacking: false,
      });

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "promotion.create",
        targetType: "promotion",
        targetId: id,
        afterDiff: {
          kind: "AUTOMATIC",
          discountType: "PERCENTAGE",
          discountValue: percentage,
        },
        correlationId,
      });
    });

    revalidateDiscounts(locale);
    return ok({ targetId });
  } catch {
    return err("DISCOUNT_UPSERT_FAILED", "Unable to save discount.");
  }
}

/** Batch-saves category percentage discounts from the discounts board. */
export async function saveCategoryDiscountsAction(
  locale: string,
  raw: z.infer<typeof categoryBatchSchema>,
): Promise<Result<{ saved: number }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = categoryBatchSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid category discounts payload.");
  }

  for (const item of parsed.data.items) {
    const result = await upsertTargetDiscountAction(locale, {
      target: "category",
      targetId: item.categoryId,
      percentage: item.percentage,
    });
    if (!result.ok) {
      return result;
    }
  }

  return ok({ saved: parsed.data.items.length });
}
