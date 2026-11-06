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
  bulkChangeOrderStatusSchema,
  type BulkChangeOrderStatusInput,
} from '@/features/orders/schemas/change-status';
import { requireAdmin } from '@/lib/auth/policies';
import { createId } from '@/lib/id';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { logger } from '@/lib/observability/logger';
import { err, ok, type Result } from '@/lib/result';

/** Bulk-applies an eligible status transition to selected orders. */
export async function bulkChangeOrderStatusAction(
  locale: string,
  raw: BulkChangeOrderStatusInput,
): Promise<Result<{ updated: number; skipped: number }>> {
  if (!isLocale(locale)) {
    return err('INVALID_LOCALE', 'Invalid locale.');
  }

  const parsed = bulkChangeOrderStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid bulk payload.');
  }

  const actor = await requireAdmin(locale as Locale);
  let updated = 0;
  let skipped = 0;

  for (const orderNumber of parsed.data.orderNumbers) {
    try {
      const changed = await withTransaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(orders)
          .where(eq(orders.orderNumber, orderNumber))
          .for('update')
          .limit(1);

        if (!existing || existing.isArchived) {
          return false;
        }

        if (!isOrderStatus(existing.status)) {
          return false;
        }

        const toStatus = parsed.data.toStatus as OrderStatus;
        if (!canTransitionOrderStatus(existing.status, toStatus)) {
          return false;
        }

        const now = new Date();
        await tx
          .update(orders)
          .set({ status: toStatus, updatedAt: now })
          .where(eq(orders.id, existing.id));

        const restoresStock =
          toStatus === 'CANCELLED' && shouldRestoreStockOnCancel(existing.status);
        const reopensOrder = existing.status === 'CANCELLED' && toStatus !== 'CANCELLED';
        if (restoresStock || reopensOrder) {
          const items = await tx
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, existing.id));

          if (restoresStock) {
            await restoreOrderStock(tx, items, existing.id, actor.id, existing.orderNumber, now);
          } else {
            await reserveReopenedOrderStock(
              tx,
              items,
              existing.id,
              actor.id,
              existing.orderNumber,
              now,
            );
          }
        }

        await tx.insert(orderEvents).values({
          id: createId(),
          orderId: existing.id,
          eventType: 'STATUS_CHANGE',
          fromState: existing.status,
          toState: toStatus,
          actorUserId: actor.id,
          isCustomerVisible: true,
          payload: { source: 'bulk' },
        });

        await tx.insert(auditLogs).values({
          id: createId(),
          actorUserId: actor.id,
          action: 'order.bulk_change_status',
          targetType: 'order',
          targetId: existing.id,
          beforeDiff: { status: existing.status },
          afterDiff: { status: toStatus },
          correlationId: createId(),
        });

        return true;
      });

      if (changed) {
        updated += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK_TO_REOPEN') {
        skipped += 1;
        continue;
      }

      logger.error('orders.bulk_status_failed', {
        orderNumber,
        error: error instanceof Error ? error.message : 'unknown',
      });
      return err('ORDER_BULK_STATUS_FAILED', 'Unable to update the selected orders.');
    }
  }

  revalidatePath(`/${locale}/admin/orders`);
  return ok({ updated, skipped });
}
