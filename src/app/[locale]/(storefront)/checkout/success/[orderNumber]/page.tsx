import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

import { AppLink } from '@/components/ui/AppLink';
import { getDb } from '@/db/client';
import { orders, payments } from '@/db/schema';
import {
  GUEST_ORDER_ACCESS_COOKIE_PREFIX,
  hasGuestOrderAccess,
} from '@/lib/payments/guest-order-access';
import { getCurrentUser } from '@/lib/auth/session';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { defaultCurrency, isCurrency } from '@/lib/money/currency';
import { formatMoneyAmount } from '@/lib/money/format';

type SuccessPageProps = {
  params: Promise<{ locale: string; orderNumber: string }>;
};

export default async function CheckoutSuccessPage({ params }: SuccessPageProps) {
  const { locale, orderNumber } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const copy = dictionary.checkout.success;
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const [order] = await getDb()
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!order) {
    notFound();
  }

  if (order.userId && (!user || (user.id !== order.userId && user.role !== 'ADMIN'))) {
    notFound();
  }
  if (!order.userId && user?.role !== 'ADMIN') {
    const [payment] = await getDb()
      .select({ metadata: payments.metadata })
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .limit(1);
    const token = cookieStore.get(`${GUEST_ORDER_ACCESS_COOKIE_PREFIX}${order.orderNumber}`)?.value;
    if (!hasGuestOrderAccess(token, payment?.metadata?.guestAccessHash)) notFound();
  }

  const currency = isCurrency(order.baseCurrency) ? order.baseCurrency : defaultCurrency;
  const totalFormatted = formatMoneyAmount(order.totalAmount, currency, locale);
  const paymentConfirmed = order.paymentStatus === 'CAPTURED';

  return (
    <section className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold text-gray-900">
        {paymentConfirmed ? copy.title : copy.pendingTitle}
      </h1>
      <p className="text-gray-600">
        {(paymentConfirmed ? copy.body : copy.pendingBody).replace(
          '{orderNumber}',
          order.orderNumber,
        )}
      </p>
      <p className="text-sm text-gray-900">{copy.total.replace('{amount}', totalFormatted)}</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <AppLink
          href={`/${locale}/products`}
          prefetchPolicy="intent"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800"
        >
          {copy.continueShopping}
        </AppLink>
        {user ? (
          <AppLink
            href={`/${locale}/profile/orders`}
            prefetchPolicy="intent"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-900 hover:border-gray-300"
          >
            {copy.viewOrders}
          </AppLink>
        ) : null}
      </div>
    </section>
  );
}
