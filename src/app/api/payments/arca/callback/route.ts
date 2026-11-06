import { NextResponse } from 'next/server';

import { getArcaOrderStatus } from '@/lib/payments/arca-client';
import { getArcaCredentials } from '@/lib/payments/online-config';
import { isArcaPaid } from '@/lib/payments/protocol';
import { reconcileCapturedPayment } from '@/lib/payments/reconcile';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderNumber = url.searchParams.get('order');
  const providerOrderId = url.searchParams.get('orderId');
  const locale = ['hy', 'en', 'ru'].includes(url.searchParams.get('locale') ?? '')
    ? url.searchParams.get('locale')!
    : 'hy';
  const credentials = getArcaCredentials();
  if (!orderNumber || !providerOrderId || !credentials)
    return NextResponse.redirect(new URL('/', url));
  try {
    const status = await getArcaOrderStatus(credentials, providerOrderId);
    if (String(status.orderNumber) !== orderNumber || !isArcaPaid(status)) {
      return NextResponse.redirect(
        new URL(`/${locale}/checkout/success/${encodeURIComponent(orderNumber)}`, url),
      );
    }
    const amount =
      Number((status.paymentAmountInfo as Record<string, unknown> | undefined)?.depositedAmount) /
      100;
    const paymentAmountInfo = status.paymentAmountInfo as Record<string, unknown> | undefined;
    await reconcileCapturedPayment({
      provider: 'arca',
      orderNumber,
      providerReference: providerOrderId,
      amount,
      providerEventId: `arca:${providerOrderId}:captured`,
      payload: {
        errorCode: status.errorCode,
        orderStatus: status.orderStatus,
        actionCode: status.actionCode,
        paymentState: paymentAmountInfo?.paymentState,
      },
    });
    return NextResponse.redirect(
      new URL(`/${locale}/checkout/success/${encodeURIComponent(orderNumber)}`, url),
    );
  } catch {
    return NextResponse.redirect(
      new URL(`/${locale}/checkout/success/${encodeURIComponent(orderNumber)}`, url),
    );
  }
}
