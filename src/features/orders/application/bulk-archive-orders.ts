"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auditLogs, orderEvents, orders } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  bulkArchiveOrdersSchema,
  type BulkArchiveOrdersInput,
} from "@/features/orders/schemas/change-status";
import { requireAdmin } from "@/lib/auth/policies";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

/** Soft-archives selected orders (never hard delete). */
export async function bulkArchiveOrdersAction(
  locale: string,
  raw: BulkArchiveOrdersInput,
): Promise<Result<{ archived: number; skipped: number }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = bulkArchiveOrdersSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid bulk archive payload.");
  }

  const actor = await requireAdmin(locale as Locale);
  let archived = 0;
  let skipped = 0;

  for (const orderNumber of parsed.data.orderNumbers) {
    try {
      const changed = await withTransaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(orders)
          .where(eq(orders.orderNumber, orderNumber))
          .for("update")
          .limit(1);

        if (!existing || existing.isArchived) {
          return false;
        }

        const now = new Date();
        await tx
          .update(orders)
          .set({ isArchived: true, updatedAt: now })
          .where(eq(orders.id, existing.id));

        await tx.insert(orderEvents).values({
          id: createId(),
          orderId: existing.id,
          eventType: "NOTE",
          fromState: "ACTIVE",
          toState: "ARCHIVED",
          actorUserId: actor.id,
          isCustomerVisible: false,
          payload: { action: "archive", source: "bulk" },
        });

        await tx.insert(auditLogs).values({
          id: createId(),
          actorUserId: actor.id,
          action: "order.bulk_archive",
          targetType: "order",
          targetId: existing.id,
          beforeDiff: { isArchived: false },
          afterDiff: { isArchived: true },
          correlationId: createId(),
        });

        return true;
      });

      if (changed) {
        archived += 1;
      } else {
        skipped += 1;
      }
    } catch {
      skipped += 1;
    }
  }

  revalidatePath(`/${locale}/admin/orders`);
  return ok({ archived, skipped });
}
