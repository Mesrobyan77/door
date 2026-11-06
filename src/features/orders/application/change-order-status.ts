'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auditLogs, orderEvents, orderItems, orders } from '@/db/schema';
import { withTransaction } from '@/db/transaction';
import {
  reserveReopenedOrderStock,
  restoreOrderStock,
} from '@/features/orders/application/order-stock';
import {
  canTransitionOrderStatus,
  isOrderStatus,
  shouldRestoreStockOnCancel,
  type OrderStatus,
} from '@/features/orders/domain/order-status';
import {
  changeOrderStatusSchema,
  type ChangeOrderStatusInput,
} from '@/features/orders/schemas/change-status';
import { requireAdmin } from '@/lib/auth/policies';
import { createId } from '@/lib/id';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { err, ok, type Result } from '@/lib/result';

export type ChangeOrderStatusData = {
  orderNumber: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
};

/**
 * Admin fulfillment transition: validates eligibility, updates order status,
 * appends history/audit, and restores stock when cancelling pre-shipment.
 */
export async function changeOrderStatusAction(
  locale: string,
  raw: ChangeOrderStatusInput,
): Promise<Result<ChangeOrderStatusData>> {
  if (!isLocale(locale)) {
    return err('INVALID_LOCALE', 'Invalid locale.');
  }

  const parsed = changeOrderStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid status change payload.');
  }

  const actor = await requireAdmin(locale as Locale);
  const { orderNumber, toStatus, note } = parsed.data;

  try {
    const result = await withTransaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .for('update')
        .limit(1);

      if (!locked) {
        throw new Error('ORDER_NOT_FOUND');
      }

      if (!isOrderStatus(locked.status)) {
        throw new Error('INVALID_CURRENT_STATUS');
      }

      const fromStatus = locked.status;

      if (fromStatus === toStatus) {
        throw new Error('SAME_STATUS');
      }

      if (!canTransitionOrderStatus(fromStatus, toStatus)) {
        throw new Error('INVALID_TRANSITION');
      }

      const now = new Date();
      const correlationId = createId();

      await tx
        .update(orders)
        .set({ status: toStatus, updatedAt: now })
        .where(eq(orders.id, locked.id));

      await tx.insert(orderEvents).values({
        id: createId(),
        orderId: locked.id,
        eventType: 'STATUS_CHANGE',
        fromState: fromStatus,
        toState: toStatus,
        actorUserId: actor.id,
        isCustomerVisible: true,
        payload: note ? { note } : { source: 'admin' },
        correlationId,
      });

      if (note) {
        await tx.insert(orderEvents).values({
          id: createId(),
          orderId: locked.id,
          eventType: 'NOTE',
          fromState: null,
          toState: null,
          actorUserId: actor.id,
          isCustomerVisible: false,
          payload: { note },
          correlationId,
        });
      }

      const restoresStock = toStatus === 'CANCELLED' && shouldRestoreStockOnCancel(fromStatus);
      const reopensOrder = fromStatus === 'CANCELLED' && toStatus !== 'CANCELLED';
      if (restoresStock || reopensOrder) {
        const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, locked.id));

        if (restoresStock) {
          await restoreOrderStock(tx, lines, locked.id, actor.id, correlationId, now);
        } else {
          await reserveReopenedOrderStock(tx, lines, locked.id, actor.id, correlationId, now);
        }
      }

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: 'order.change_status',
        targetType: 'order',
        targetId: locked.id,
        beforeDiff: { status: fromStatus },
        afterDiff: { status: toStatus },
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
    const code = error instanceof Error ? error.message : 'UNKNOWN';

    switch (code) {
      case 'ORDER_NOT_FOUND':
        return err('ORDER_NOT_FOUND', 'Order not found.');
      case 'SAME_STATUS':
        return err('SAME_STATUS', 'Order already has this status.');
      case 'INVALID_TRANSITION':
        return err('INVALID_TRANSITION', 'That status transition is not allowed.');
      case 'INVALID_CURRENT_STATUS':
        return err('INVALID_CURRENT_STATUS', 'Order has an unknown status.');
      case 'INSUFFICIENT_STOCK_TO_REOPEN':
        return err(
          'INSUFFICIENT_STOCK',
          'The order cannot be reopened because its stock is no longer available.',
        );
      case 'ORDER_STOCK_HISTORY_MISSING':
      case 'ORDER_VARIANT_NOT_FOUND':
        return err(
          'STOCK_HISTORY_UNAVAILABLE',
          'The order stock history is incomplete; inventory was not changed.',
        );
      default:
        return err('ORDER_STATUS_FAILED', 'Unable to update order status.');
    }
  }
}
