"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProviders } from "@/config/providers";
import { auditLogs, storeSettings } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { ORDER_STATUSES } from "@/features/orders/domain/order-status";
import {
  isStoreSettingKey,
  type StoreSettingKey,
} from "@/features/settings/domain/store-settings";
import { requireAdmin } from "@/lib/auth/policies";
import { invalidateAmdFxQuotes } from "@/lib/fx/invalidate-quotes";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import {
  normalizeRateDecimalString,
  parseRateToFixed,
} from "@/lib/money/convert";
import { err, ok, type Result } from "@/lib/result";

const positiveRateSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((raw, ctx) => {
    const normalized = normalizeRateDecimalString(raw);
    try {
      parseRateToFixed(normalized);
      return normalized;
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rate must be a positive decimal (e.g. 0.0026 or 0,2137).",
      });
      return z.NEVER;
    }
  });

const upsertSchema = z.discriminatedUnion("key", [
  z.object({
    key: z.literal("store.identity"),
    value: z.object({
      name: z.string().trim().min(1).max(120),
      supportEmail: z.string().trim().email().max(254),
      phone: z.string().trim().max(40).optional(),
    }),
  }),
  z.object({
    key: z.literal("store.maintenance"),
    value: z.object({
      enabled: z.boolean(),
      message: z.string().trim().max(500).optional(),
    }),
  }),
  z.object({
    key: z.literal("store.stacking"),
    value: z.object({
      allowCouponWithAutomatic: z.boolean(),
    }),
  }),
  z.object({
    key: z.literal("store.revenue"),
    value: z.object({
      statuses: z.array(z.enum(ORDER_STATUSES)).min(1).max(7),
    }),
  }),
  z.object({
    key: z.literal("store.branding"),
    value: z.object({
      primaryColor: z.string().trim().max(32).optional(),
      logoObjectKey: z.string().trim().max(512).optional(),
    }),
  }),
  z.object({
    key: z.literal("store.social"),
    value: z.object({
      instagram: z.string().trim().max(200).optional(),
      facebook: z.string().trim().max(200).optional(),
      telegram: z.string().trim().max(200).optional(),
    }),
  }),
  z.object({
    key: z.literal("store.globalDiscount"),
    value: z.object({
      percentage: z.number().int().min(1).max(100).nullable(),
    }),
  }),
  z.object({
    key: z.literal("store.fxRates"),
    value: z.object({
      usd: positiveRateSchema,
      rub: positiveRateSchema,
    }),
  }),
]);

export type UpsertStoreSettingInput = z.infer<typeof upsertSchema>;

/** Upserts a typed store setting with audit. */
export async function upsertStoreSettingAction(
  locale: string,
  raw: UpsertStoreSettingInput,
): Promise<Result<{ key: StoreSettingKey }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return err(
      "VALIDATION_ERROR",
      firstIssue && firstIssue !== "Invalid input"
        ? firstIssue
        : "Invalid settings payload.",
    );
  }
  if (!isStoreSettingKey(parsed.data.key)) {
    return err("VALIDATION_ERROR", "Invalid settings payload.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(storeSettings)
        .where(eq(storeSettings.key, parsed.data.key))
        .limit(1);

      const now = new Date();
      if (existing) {
        await tx
          .update(storeSettings)
          .set({ value: parsed.data.value, updatedAt: now })
          .where(eq(storeSettings.key, parsed.data.key));
      } else {
        await tx.insert(storeSettings).values({
          key: parsed.data.key,
          value: parsed.data.value,
          updatedAt: now,
        });
      }

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "settings.upsert",
        targetType: "store_setting",
        targetId: parsed.data.key,
        beforeDiff: existing ? { value: existing.value } : undefined,
        afterDiff: { value: parsed.data.value },
        correlationId: createId(),
      });
    });

    if (parsed.data.key === "store.fxRates") {
      await invalidateAmdFxQuotes(getProviders().redis.getClient());
    }

    revalidatePath(`/${locale}/admin/settings`);
    revalidatePath(`/${locale}/admin`);
    return ok({ key: parsed.data.key });
  } catch {
    return err("SETTINGS_UPSERT_FAILED", "Unable to save settings.");
  }
}
