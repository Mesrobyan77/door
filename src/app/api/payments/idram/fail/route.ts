import { NextResponse } from 'next/server';

/** Idram failure redirects do not alter payment state; only the signed RESULT_URL does. */
export function GET(request: Request) {
  return NextResponse.redirect(new URL('/hy/checkout', request.url));
}
