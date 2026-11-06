"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auditLogs, orderEvents, orders } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  archiveOrderSchema,
  type ArchiveOrderInput,
} from "@/features/orders/schemas/change-status";
import { requireAdmin } from "@/lib/auth/policies";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

/** Archives or restores an order (soft archive, never hard delete). */
export async function archiveOrderAction(
  locale: string,
  raw: ArchiveOrderInput,
): Promise<Result<{ orderNumber: string; isArchived: boolean }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = archiveOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid archive payload.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    const result = await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, parsed.data.orderNumber))
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      if (existing.isArchived === parsed.data.archive) {
        throw new Error("SAME_STATE");
      }

      const now = new Date();
      await tx
        .update(orders)
        .set({ isArchived: parsed.data.archive, updatedAt: now })
        .where(eq(orders.id, existing.id));

      await tx.insert(orderEvents).values({
        id: createId(),
        orderId: existing.id,
        eventType: "NOTE",
        fromState: existing.isArchived ? "ARCHIVED" : "ACTIVE",
        toState: parsed.data.archive ? "ARCHIVED" : "ACTIVE",
        actorUserId: actor.id,
        isCustomerVisible: false,
        payload: { action: parsed.data.archive ? "archive" : "restore" },
      });

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: parsed.data.archive ? "order.archive" : "order.restore",
        targetType: "order",
        targetId: existing.id,
        beforeDiff: { isArchived: existing.isArchived },
        afterDiff: { isArchived: parsed.data.archive },
        correlationId: createId(),
      });

      return {
        orderNumber: existing.orderNumber,
        isArchived: parsed.data.archive,
      };
    });

    revalidatePath(`/${locale}/admin/orders`);
    revalidatePath(`/${locale}/admin/orders/${result.orderNumber}`);
    return ok(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "NOT_FOUND") {
      return err("NOT_FOUND", "Order not found.");
    }
    if (code === "SAME_STATE") {
      return err("SAME_STATE", "Order already in that archive state.");
    }
    return err("ARCHIVE_FAILED", "Unable to update archive state.");
  }
}
