import { and, eq, sql } from 'drizzle-orm';

import { orderItems, productVariants, stockMovements } from '@/db/schema';
import type { DbTransaction } from '@/db/transaction';
import { createId } from '@/lib/id';

type OrderStockLine = Pick<typeof orderItems.$inferSelect, 'productId' | 'variantId' | 'quantity'>;

function getVariantId(line: OrderStockLine): string | null {
  return line.variantId ?? line.productId;
}

async function getOrderMovementBalance(tx: DbTransaction, orderId: string, variantId: string) {
  const [balance] = await tx
    .select({
      netDelta: sql<number>`coalesce(sum(${stockMovements.delta}), 0)::int`,
      movementCount: sql<number>`count(*)::int`,
    })
    .from(stockMovements)
    .where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.variantId, variantId)));

  return balance ?? { netDelta: 0, movementCount: 0 };
}

export async function restoreOrderStock(
  tx: DbTransaction,
  lines: OrderStockLine[],
  orderId: string,
  actorUserId: string,
  correlationId: string,
  now: Date,
): Promise<void> {
  const orderedLines = [...lines].sort((a, b) =>
    (getVariantId(a) ?? '').localeCompare(getVariantId(b) ?? ''),
  );

  for (const line of orderedLines) {
    const variantId = getVariantId(line);
    if (!variantId) {
      throw new Error('ORDER_VARIANT_NOT_FOUND');
    }
    const [variant] = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .for('update')
      .limit(1);
    if (!variant) {
      throw new Error('ORDER_VARIANT_NOT_FOUND');
    }

    const balance = await getOrderMovementBalance(tx, orderId, variant.id);
    if (balance.movementCount === 0) {
      throw new Error('ORDER_STOCK_HISTORY_MISSING');
    }
    if (balance.netDelta > 0) continue;

    const quantity =
      balance.netDelta < 0 ? Math.min(line.quantity, -balance.netDelta) : line.quantity;
    if (quantity <= 0) continue;

    const nextStock = variant.stockOnHand + quantity;
    await tx
      .update(productVariants)
      .set({ stockOnHand: nextStock, updatedAt: now })
      .where(eq(productVariants.id, variant.id));
    await tx.insert(stockMovements).values({
      id: createId(),
      productId: variant.productId,
      variantId: variant.id,
      delta: quantity,
      reason: 'CANCEL',
      orderId,
      actorUserId,
      resultingBalance: nextStock,
      correlationId,
    });
  }
}

export async function reserveReopenedOrderStock(
  tx: DbTransaction,
  lines: OrderStockLine[],
  orderId: string,
  actorUserId: string,
  correlationId: string,
  now: Date,
): Promise<void> {
  const orderedLines = [...lines].sort((a, b) =>
    (getVariantId(a) ?? '').localeCompare(getVariantId(b) ?? ''),
  );

  for (const line of orderedLines) {
    const variantId = getVariantId(line);
    if (!variantId) {
      throw new Error('ORDER_VARIANT_NOT_FOUND');
    }
    const [variant] = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .for('update')
      .limit(1);
    if (!variant) {
      throw new Error('ORDER_VARIANT_NOT_FOUND');
    }

    const balance = await getOrderMovementBalance(tx, orderId, variant.id);
    if (balance.movementCount === 0) {
      throw new Error('ORDER_STOCK_HISTORY_MISSING');
    }
    if (balance.netDelta !== 0) continue;
    if (variant.stockOnHand < line.quantity) {
      throw new Error('INSUFFICIENT_STOCK_TO_REOPEN');
    }

    const nextStock = variant.stockOnHand - line.quantity;
    await tx
      .update(productVariants)
      .set({ stockOnHand: nextStock, updatedAt: now })
      .where(eq(productVariants.id, variant.id));
    await tx.insert(stockMovements).values({
      id: createId(),
      productId: variant.productId,
      variantId: variant.id,
      delta: -line.quantity,
      reason: 'ORDER',
      orderId,
      actorUserId,
      resultingBalance: nextStock,
      correlationId,
    });
  }
}
