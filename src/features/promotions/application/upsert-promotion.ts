"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auditLogs, promotions } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  normalizePromotionCode,
  promotionRuleErrorMessage,
  validatePromotionRules,
} from "@/features/promotions/domain/promotion-rules";
import {
  togglePromotionSchema,
  upsertPromotionSchema,
  type TogglePromotionInput,
  type UpsertPromotionInput,
} from "@/features/promotions/schemas/admin-promotions";
import { requireAdmin } from "@/lib/auth/policies";
import { invalidateProductsCache } from "@/lib/cache/invalidate-public";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

function toRuleInput(data: UpsertPromotionInput) {
  const code =
    data.kind === "COUPON" && data.code
      ? normalizePromotionCode(data.code)
      : null;

  return {
    kind: data.kind,
    code,
    productId: data.kind === "AUTOMATIC" ? data.productId : null,
    categoryId: data.kind === "AUTOMATIC" ? data.categoryId : null,
    discountType: data.discountType,
    discountValue: data.discountValue,
    maxDiscountAmount: data.maxDiscountAmount,
    minimumOrderAmount: data.minimumOrderAmount,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
  };
}

function revalidatePromotionPaths(locale: string, id?: string): void {
  revalidatePath(`/${locale}/admin/coupons`);
  revalidatePath(`/${locale}/admin/discounts`);
  if (id) {
    revalidatePath(`/${locale}/admin/coupons/${id}`);
    revalidatePath(`/${locale}/admin/discounts/${id}`);
  }
  revalidatePath(`/${locale}/products`);
  revalidatePath(`/${locale}`);
  invalidateProductsCache({ allProductDetails: true });
}

/** Creates a coupon or automatic promotion with domain validation and audit. */
export async function createPromotionAction(
  locale: string,
  raw: UpsertPromotionInput,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = upsertPromotionSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid promotion payload.");
  }

  const actor = await requireAdmin(locale as Locale);
  const ruleInput = toRuleInput(parsed.data);
  const ruleError = validatePromotionRules(ruleInput);
  if (ruleError) {
    return err(ruleError, promotionRuleErrorMessage(ruleError));
  }

  try {
    const id = createId();
    const now = new Date();
    const correlationId = createId();

    await withTransaction(async (tx) => {
      await tx.insert(promotions).values({
        id,
        kind: ruleInput.kind,
        code: ruleInput.code,
        productId: ruleInput.productId,
        categoryId: ruleInput.categoryId,
        discountType: parsed.data.discountType,
        discountValue: parsed.data.discountValue,
        maxDiscountAmount: parsed.data.maxDiscountAmount,
        minimumOrderAmount: parsed.data.minimumOrderAmount,
        totalUsageLimit: parsed.data.totalUsageLimit,
        perUserUsageLimit: parsed.data.perUserUsageLimit,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        isActive: parsed.data.isActive,
        priority: parsed.data.priority,
        allowStacking: parsed.data.allowStacking,
      });

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "promotion.create",
        targetType: "promotion",
        targetId: id,
        afterDiff: {
          kind: ruleInput.kind,
          code: ruleInput.code,
          discountType: parsed.data.discountType,
          discountValue: parsed.data.discountValue,
          isActive: parsed.data.isActive,
        },
        correlationId,
        context: { createdAt: now.toISOString() },
      });
    });

    revalidatePromotionPaths(locale, id);
    return ok({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("promotions_code_uidx") || message.includes("unique")) {
      return err("CODE_TAKEN", "That coupon code is already in use.");
    }
    return err("PROMOTION_CREATE_FAILED", "Unable to create promotion.");
  }
}

/** Updates an existing promotion while preserving kind and used_count. */
export async function updatePromotionAction(
  locale: string,
  promotionId: string,
  raw: UpsertPromotionInput,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = upsertPromotionSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid promotion payload.");
  }

  const actor = await requireAdmin(locale as Locale);
  const ruleInput = toRuleInput(parsed.data);
  const ruleError = validatePromotionRules(ruleInput);
  if (ruleError) {
    return err(ruleError, promotionRuleErrorMessage(ruleError));
  }

  try {
    await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(promotions)
        .where(eq(promotions.id, promotionId))
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      if (existing.kind !== parsed.data.kind) {
        throw new Error("KIND_LOCKED");
      }

      const now = new Date();
      const correlationId = createId();

      await tx
        .update(promotions)
        .set({
          code: ruleInput.code,
          productId: ruleInput.productId,
          categoryId: ruleInput.categoryId,
          discountType: parsed.data.discountType,
          discountValue: parsed.data.discountValue,
          maxDiscountAmount: parsed.data.maxDiscountAmount,
          minimumOrderAmount: parsed.data.minimumOrderAmount,
          totalUsageLimit: parsed.data.totalUsageLimit,
          perUserUsageLimit: parsed.data.perUserUsageLimit,
          startsAt: parsed.data.startsAt,
          endsAt: parsed.data.endsAt,
          isActive: parsed.data.isActive,
          priority: parsed.data.priority,
          allowStacking: parsed.data.allowStacking,
          updatedAt: now,
        })
        .where(eq(promotions.id, promotionId));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "promotion.update",
        targetType: "promotion",
        targetId: promotionId,
        beforeDiff: {
          code: existing.code,
          discountValue: existing.discountValue,
          isActive: existing.isActive,
        },
        afterDiff: {
          code: ruleInput.code,
          discountValue: parsed.data.discountValue,
          isActive: parsed.data.isActive,
        },
        correlationId,
      });
    });

    revalidatePromotionPaths(locale, promotionId);
    return ok({ id: promotionId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "NOT_FOUND") {
      return err("NOT_FOUND", "Promotion not found.");
    }
    if (code === "KIND_LOCKED") {
      return err("KIND_LOCKED", "Promotion kind cannot be changed.");
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("promotions_code_uidx") || message.includes("unique")) {
      return err("CODE_TAKEN", "That coupon code is already in use.");
    }
    return err("PROMOTION_UPDATE_FAILED", "Unable to update promotion.");
  }
}

/** Toggles promotion active flag with audit. */
export async function togglePromotionAction(
  locale: string,
  raw: TogglePromotionInput,
): Promise<Result<{ id: string; isActive: boolean }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = togglePromotionSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid toggle payload.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    const result = await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(promotions)
        .where(eq(promotions.id, parsed.data.promotionId))
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      await tx
        .update(promotions)
        .set({ isActive: parsed.data.isActive, updatedAt: new Date() })
        .where(eq(promotions.id, existing.id));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "promotion.toggle",
        targetType: "promotion",
        targetId: existing.id,
        beforeDiff: { isActive: existing.isActive },
        afterDiff: { isActive: parsed.data.isActive },
        correlationId: createId(),
      });

      return { id: existing.id, isActive: parsed.data.isActive };
    });

    revalidatePromotionPaths(locale, result.id);
    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return err("NOT_FOUND", "Promotion not found.");
    }
    return err("PROMOTION_TOGGLE_FAILED", "Unable to toggle promotion.");
  }
}

/** Deletes a promotion (hard delete; usage rows cascade). */
export async function deletePromotionAction(
  locale: string,
  promotionId: string,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(promotions)
        .where(eq(promotions.id, promotionId))
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      await tx.delete(promotions).where(eq(promotions.id, promotionId));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "promotion.delete",
        targetType: "promotion",
        targetId: promotionId,
        beforeDiff: {
          kind: existing.kind,
          code: existing.code,
          usedCount: existing.usedCount,
        },
        correlationId: createId(),
      });
    });

    revalidatePromotionPaths(locale);
    return ok({ id: promotionId });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return err("NOT_FOUND", "Promotion not found.");
    }
    return err("PROMOTION_DELETE_FAILED", "Unable to delete promotion.");
  }
}

/** Duplicates a coupon as a new inactive code. */
export async function duplicatePromotionAction(
  locale: string,
  promotionId: string,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    const id = createId();

    await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(promotions)
        .where(eq(promotions.id, promotionId))
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      if (existing.kind !== "COUPON" || !existing.code) {
        throw new Error("NOT_COUPON");
      }

      const suffix = createId().slice(0, 6).toUpperCase();
      const nextCode = normalizePromotionCode(
        `${existing.code}-COPY-${suffix}`.slice(0, 64),
      );

      await tx.insert(promotions).values({
        id,
        kind: "COUPON",
        code: nextCode,
        productId: null,
        categoryId: null,
        discountType: existing.discountType,
        discountValue: existing.discountValue,
        maxDiscountAmount: existing.maxDiscountAmount,
        minimumOrderAmount: existing.minimumOrderAmount,
        totalUsageLimit: existing.totalUsageLimit,
        perUserUsageLimit: existing.perUserUsageLimit,
        startsAt: existing.startsAt,
        endsAt: existing.endsAt,
        isActive: false,
        priority: existing.priority,
        allowStacking: existing.allowStacking,
      });

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "promotion.duplicate",
        targetType: "promotion",
        targetId: id,
        afterDiff: { sourceId: promotionId, code: nextCode },
        correlationId: createId(),
      });
    });

    revalidatePromotionPaths(locale, id);
    return ok({ id });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "NOT_FOUND") {
      return err("NOT_FOUND", "Promotion not found.");
    }
    if (code === "NOT_COUPON") {
      return err("NOT_COUPON", "Only coupons can be duplicated here.");
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("promotions_code_uidx") || message.includes("unique")) {
      return err("CODE_TAKEN", "That coupon code is already in use.");
    }
    return err("PROMOTION_DUPLICATE_FAILED", "Unable to duplicate promotion.");
  }
}
