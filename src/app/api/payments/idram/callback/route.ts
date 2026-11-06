import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';

import { getEnv } from '@/config/env';
import { getDb } from '@/db/client';
import { orders, payments } from '@/db/schema';
import { idramChecksum } from '@/lib/payments/protocol';
import { reconcileCapturedPayment } from '@/lib/payments/reconcile';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const data = Object.fromEntries(
    (await request.formData()).entries().map(([key, value]) => [key, String(value)]),
  );
  const env = getEnv();
  const recAccount =
    env.IDRAM_TEST_MODE === 'true' ? env.IDRAM_REC_ACCOUNT : env.IDRAM_LIVE_REC_ACCOUNT;
  const secret = env.IDRAM_TEST_MODE === 'true' ? env.IDRAM_SECRET_KEY : env.IDRAM_LIVE_SECRET_KEY;
  if (
    !recAccount ||
    !secret ||
    data.EDP_REC_ACCOUNT !== recAccount ||
    !data.EDP_BILL_NO ||
    !data.EDP_AMOUNT
  )
    return new NextResponse('INVALID', { status: 400 });
  if (data.EDP_PRECHECK === 'YES') {
    const [payment] = await getDb()
      .select({ amount: payments.amount, status: payments.status })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .where(and(eq(orders.orderNumber, data.EDP_BILL_NO), eq(payments.provider, 'idram')))
      .orderBy(desc(payments.attemptNumber))
      .limit(1);
    return payment && payment.status === 'PENDING' && String(payment.amount) === data.EDP_AMOUNT
      ? new NextResponse('OK')
      : new NextResponse('INVALID', { status: 400 });
  }
  const required = ['EDP_PAYER_ACCOUNT', 'EDP_TRANS_ID', 'EDP_TRANS_DATE', 'EDP_CHECKSUM'] as const;
  if (required.some((key) => !data[key])) return new NextResponse('INVALID', { status: 400 });
  const billNumber = data.EDP_BILL_NO;
  const checksum = data.EDP_CHECKSUM;
  const transactionId = data.EDP_TRANS_ID;
  const transactionDate = data.EDP_TRANS_DATE;
  if (!billNumber || !checksum || !transactionId || !transactionDate)
    return new NextResponse('INVALID', { status: 400 });
  const expected = idramChecksum(data as Record<string, string>, secret);
  if (expected.toUpperCase() !== checksum.toUpperCase())
    return new NextResponse('INVALID', { status: 400 });
  const amount = Number(data.EDP_AMOUNT);
  if (!Number.isSafeInteger(amount) || amount < 0)
    return new NextResponse('INVALID', { status: 400 });
  const result = await reconcileCapturedPayment({
    provider: 'idram',
    orderNumber: billNumber,
    providerReference: transactionId,
    amount,
    providerEventId: `idram:${transactionId}`,
    payload: { transactionDate },
  });
  return new NextResponse(
    result === 'captured' || result === 'replayed' || result === 'conflict' ? 'OK' : 'INVALID',
    {
      status: result === 'mismatch' ? 400 : 200,
    },
  );
}
