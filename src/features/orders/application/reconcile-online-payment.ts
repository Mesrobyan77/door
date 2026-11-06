'use server';

import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auditLogs, orders, payments } from '@/db/schema';
import { withTransaction } from '@/db/transaction';
import { getArcaOrderStatus } from '@/lib/payments/arca-client';
import { getArcaCredentials } from '@/lib/payments/online-config';
import { isArcaPaid } from '@/lib/payments/protocol';
import { reconcileCapturedPayment } from '@/lib/payments/reconcile';
import { requireAdmin } from '@/lib/auth/policies';
import { createId } from '@/lib/id';
import { isLocale, type Locale } from '@/lib/i18n/config';

/** Admin reconciliation: ArCa has a documented status API; Idram does not. */
export async function reconcileOnlinePaymentAction(locale: string, orderNumber: string) {
  if (!isLocale(locale)) return { ok: false, error: 'Invalid locale.' };
  const actor = await requireAdmin(locale as Locale);
  const [order] = await withTransaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .for('update')
      .limit(1);
    if (!row) throw new Error('NOT_FOUND');
    return [row];
  });
  if (!order) return { ok: false, error: 'Order not found.' };
  const [payment] = await (await import('@/db/client'))
    .getDb()
    .select()
    .from(payments)
    .where(eq(payments.orderId, order.id))
    .orderBy(desc(payments.attemptNumber))
    .limit(1);
  if (!payment) return { ok: false, error: 'Payment not found.' };
  if (payment.provider === 'idram') {
    await (
      await import('@/db/client')
    )
      .getDb()
      .insert(auditLogs)
      .values({
        id: createId(),
        actorUserId: actor.id,
        action: 'payment.reconcile_unavailable',
        targetType: 'order',
        targetId: order.id,
        context: {
          provider: 'idram',
          reason: 'Idram has no documented merchant status API; await signed RESULT_URL callback.',
        },
      });
    return { ok: false, error: 'Idram reconciliation awaits its signed RESULT_URL callback.' };
  }
  if (payment.provider !== 'arca' || !payment.providerReference)
    return { ok: false, error: 'This payment cannot be reconciled.' };
  const credentials = getArcaCredentials();
  if (!credentials) return { ok: false, error: 'ArCa is not configured.' };
  const status = await getArcaOrderStatus(credentials, payment.providerReference);
  if (String(status.orderNumber) !== orderNumber)
    return { ok: false, error: 'ArCa order identity mismatch.' };
  const amount =
    Number((status.paymentAmountInfo as Record<string, unknown> | undefined)?.depositedAmount) /
    100;
  const result = isArcaPaid(status)
    ? await reconcileCapturedPayment({
        provider: 'arca',
        orderNumber,
        providerReference: payment.providerReference,
        amount,
        providerEventId: `arca:${payment.providerReference}:admin`,
        payload: {
          source: 'admin_reconciliation',
          orderStatus: status.orderStatus,
          errorCode: status.errorCode,
        },
      })
    : 'pending';
  await (
    await import('@/db/client')
  )
    .getDb()
    .insert(auditLogs)
    .values({
      id: createId(),
      actorUserId: actor.id,
      action: 'payment.reconcile',
      targetType: 'order',
      targetId: order.id,
      context: { provider: 'arca', result },
    });
  revalidatePath(`/${locale}/admin/orders/${orderNumber}`);
  return { ok: true, result };
}
