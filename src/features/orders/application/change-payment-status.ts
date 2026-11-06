"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auditLogs, orderEvents, orders, payments } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  canTransitionPaymentStatus,
  isPaymentStatus,
  type PaymentStatus,
} from "@/features/orders/domain/payment-status";
import {
  changePaymentStatusSchema,
  type ChangePaymentStatusInput,
} from "@/features/orders/schemas/change-payment-status";
import { requireAdmin } from "@/lib/auth/policies";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

export type ChangePaymentStatusData = {
  orderNumber: string;
  fromStatus: PaymentStatus;
  toStatus: PaymentStatus;
};

/**
 * Admin payment transition: updates order + latest payment row,
 * appends payment history event and audit log.
 */
export async function changePaymentStatusAction(
  locale: string,
  raw: ChangePaymentStatusInput,
): Promise<Result<ChangePaymentStatusData>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = changePaymentStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid payment status payload.");
  }

  const actor = await requireAdmin(locale as Locale);
  const { orderNumber, toStatus, note } = parsed.data;

  try {
    const result = await withTransaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .for("update")
        .limit(1);

      if (!locked) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (!isPaymentStatus(locked.paymentStatus)) {
        throw new Error("INVALID_CURRENT_STATUS");
      }

      const fromStatus = locked.paymentStatus;

      if (fromStatus === toStatus) {
        throw new Error("SAME_STATUS");
      }

      if (!canTransitionPaymentStatus(fromStatus, toStatus)) {
        throw new Error("INVALID_TRANSITION");
      }

      const now = new Date();
      const correlationId = createId();

      await tx
        .update(orders)
        .set({ paymentStatus: toStatus, updatedAt: now })
        .where(eq(orders.id, locked.id));

      const [latestPayment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.orderId, locked.id))
        .orderBy(desc(payments.attemptNumber))
        .limit(1);

      if (latestPayment) {
        await tx
          .update(payments)
          .set({ status: toStatus, updatedAt: now })
          .where(eq(payments.id, latestPayment.id));
      }

      await tx.insert(orderEvents).values({
        id: createId(),
        orderId: locked.id,
        eventType: "PAYMENT_PROVIDER",
        fromState: fromStatus,
        toState: toStatus,
        actorUserId: actor.id,
        isCustomerVisible: true,
        payload: {
          source: "admin",
          paymentId: latestPayment?.id ?? null,
          note: note ?? null,
        },
        correlationId,
      });

      if (note) {
        await tx.insert(orderEvents).values({
          id: createId(),
          orderId: locked.id,
          eventType: "NOTE",
          actorUserId: actor.id,
          isCustomerVisible: false,
          payload: { note, context: "payment_status" },
          correlationId,
        });
      }

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "order.change_payment_status",
        targetType: "order",
        targetId: locked.id,
        beforeDiff: { paymentStatus: fromStatus },
        afterDiff: { paymentStatus: toStatus },
        correlationId,
        context: { orderNumber, note: note ?? null },
      });

      return { orderNumber, fromStatus, toStatus };
    });

    revalidatePath(`/${locale}/admin/orders`);
    revalidatePath(`/${locale}/admin/orders/${orderNumber}`);
    revalidatePath(`/${locale}/profile/orders`);

    return ok(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";

    switch (code) {
      case "ORDER_NOT_FOUND":
        return err("ORDER_NOT_FOUND", "Order not found.");
      case "SAME_STATUS":
        return err("SAME_STATUS", "Payment already has this status.");
      case "INVALID_TRANSITION":
        return err(
          "INVALID_TRANSITION",
          "That payment transition is not allowed.",
        );
      case "INVALID_CURRENT_STATUS":
        return err(
          "INVALID_CURRENT_STATUS",
          "Order has an unknown payment status.",
        );
      default:
        return err(
          "PAYMENT_STATUS_FAILED",
          "Unable to update payment status.",
        );
    }
  }
}
