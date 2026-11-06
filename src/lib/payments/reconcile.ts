import 'server-only';

import { and, desc, eq } from 'drizzle-orm';

import { cartItems, orderEvents, orders, payments, stockMovements } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { withTransaction } from '@/db/transaction';
import { createId } from '@/lib/id';

type CheckoutItem = { variantId: string; quantity: number };

function checkoutItems(metadata: Record<string, unknown> | null): CheckoutItem[] {
  const values = metadata?.checkoutItems;
  if (!Array.isArray(values)) return [];
  return values.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const value = item as Record<string, unknown>;
    return typeof value.variantId === 'string' &&
      Number.isInteger(value.quantity) &&
      Number(value.quantity) > 0
      ? [{ variantId: value.variantId, quantity: Number(value.quantity) }]
      : [];
  });
}

/** Applies one authoritative provider result. Replays remain harmless. */
export async function reconcileCapturedPayment(input: {
  provider: 'arca' | 'idram';
  orderNumber: string;
  providerReference: string;
  amount: number;
  providerEventId: string;
  payload: Record<string, unknown>;
}): Promise<'captured' | 'replayed' | 'conflict' | 'mismatch' | 'not_found'> {
  return withTransaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, input.orderNumber))
      .for('update')
      .limit(1);
    if (!order) return 'not_found';
    const [payment] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.provider, input.provider)))
      .orderBy(desc(payments.attemptNumber))
      .for('update')
      .limit(1);
    if (!payment) return 'not_found';
    if (
      payment.amount !== input.amount ||
      payment.currency !== 'AMD' ||
      (payment.providerReference && payment.providerReference !== input.providerReference)
    )
      return 'mismatch';
    if (payment.status === 'CAPTURED' || order.paymentStatus === 'CAPTURED') return 'replayed';
    const [stockState] = await tx
      .select({ net: sql<number>`coalesce(sum(${stockMovements.delta}), 0)::int` })
      .from(stockMovements)
      .where(eq(stockMovements.orderId, order.id));
    if ((stockState?.net ?? 0) >= 0) {
      await tx
        .insert(orderEvents)
        .values({
          id: createId(),
          orderId: order.id,
          eventType: 'PAYMENT_PROVIDER',
          fromState: payment.status,
          toState: 'MANUAL_REVIEW',
          isCustomerVisible: false,
          providerEventId: input.providerEventId,
          payload: {
            provider: input.provider,
            providerReference: input.providerReference,
            reason: 'LATE_PAYMENT_AFTER_STOCK_RELEASE',
          },
        })
        .onConflictDoNothing();
      return 'conflict';
    }
    const now = new Date();
    await tx
      .update(payments)
      .set({ status: 'CAPTURED', providerReference: input.providerReference, updatedAt: now })
      .where(eq(payments.id, payment.id));
    await tx
      .update(orders)
      .set({ paymentStatus: 'CAPTURED', status: 'CONFIRMED', updatedAt: now })
      .where(eq(orders.id, order.id));
    await tx
      .insert(orderEvents)
      .values({
        id: createId(),
        orderId: order.id,
        eventType: 'PAYMENT_PROVIDER',
        fromState: payment.status,
        toState: 'CAPTURED',
        isCustomerVisible: true,
        providerEventId: input.providerEventId,
        payload: {
          provider: input.provider,
          providerReference: input.providerReference,
          verification: input.payload,
        },
      })
      .onConflictDoNothing();
    const cartId = typeof payment.metadata?.cartId === 'string' ? payment.metadata.cartId : null;
    if (cartId)
      for (const item of checkoutItems(payment.metadata)) {
        const [line] = await tx
          .select()
          .from(cartItems)
          .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, item.variantId)))
          .for('update')
          .limit(1);
        if (!line) continue;
        if (line.quantity <= item.quantity)
          await tx.delete(cartItems).where(eq(cartItems.id, line.id));
        else
          await tx
            .update(cartItems)
            .set({ quantity: line.quantity - item.quantity, updatedAt: now })
            .where(eq(cartItems.id, line.id));
      }
    return 'captured';
  });
}
