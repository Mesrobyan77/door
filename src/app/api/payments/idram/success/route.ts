import { NextResponse } from 'next/server';

export function GET(request: Request) {
  const url = new URL(request.url);
  const orderNumber = url.searchParams.get('order_number');
  return NextResponse.redirect(
    new URL(
      orderNumber ? `/hy/checkout/success/${encodeURIComponent(orderNumber)}` : '/hy/checkout',
      url,
    ),
  );
}
