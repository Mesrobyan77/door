"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auditLogs, orderEvents, orders } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  addOrderNoteSchema,
  type AddOrderNoteInput,
} from "@/features/orders/schemas/change-status";
import { requireAdmin } from "@/lib/auth/policies";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

/** Adds an internal admin note to order history. */
export async function addOrderNoteAction(
  locale: string,
  raw: AddOrderNoteInput,
): Promise<Result<{ orderNumber: string }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = addOrderNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid note payload.");
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

      await tx.insert(orderEvents).values({
        id: createId(),
        orderId: existing.id,
        eventType: "NOTE",
        fromState: null,
        toState: null,
        actorUserId: actor.id,
        isCustomerVisible: false,
        payload: { note: parsed.data.note },
      });

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "order.add_note",
        targetType: "order",
        targetId: existing.id,
        afterDiff: { noteLength: parsed.data.note.length },
        correlationId: createId(),
      });

      return { orderNumber: existing.orderNumber };
    });

    revalidatePath(`/${locale}/admin/orders/${result.orderNumber}`);
    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return err("NOT_FOUND", "Order not found.");
    }
    return err("NOTE_FAILED", "Unable to add note.");
  }
}
