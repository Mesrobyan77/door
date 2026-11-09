import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { getProviders } from '@/config/providers';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import {
  consumeEmailVerificationToken,
  getEmailVerificationToken,
} from '@/lib/auth/email-verification-tokens';
import { ResendVerificationForm } from '@/features/auth/ui/ResendVerificationForm';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

function tokenFrom(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string | string[]; sent?: string; delivery?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale).auth;
  const token = tokenFrom(query.token);
  let state: 'pending' | 'verified' | 'invalid' | 'already' = 'pending';

  if (token) {
    const redis = getProviders().redis.getClient();
    const record = await getEmailVerificationToken(redis, token);
    if (!record) {
      state = 'invalid';
    } else {
      const [user] = await getDb()
        .select({ id: users.id, status: users.status, emailVerifiedAt: users.emailVerifiedAt })
        .from(users)
        .where(eq(users.id, record.userId))
        .limit(1);
      if (!user || user.status !== 'ACTIVE') state = 'invalid';
      else if (user.emailVerifiedAt) {
        await consumeEmailVerificationToken(redis, token, user.id);
        state = 'already';
      } else {
        // Persist before destructive consumption so a DB outage cannot strand a user.
        const verified = await getDb()
          .update(users)
          .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(users.id, user.id), isNull(users.emailVerifiedAt)))
          .returning({ id: users.id });
        if (verified.length === 0) state = 'already';
        else {
          await consumeEmailVerificationToken(redis, token, user.id);
          state = 'verified';
        }
      }
    }
  }

  const title =
    state === 'verified'
      ? dictionary.verificationSuccessTitle
      : state === 'already'
        ? dictionary.verificationAlreadyTitle
        : state === 'invalid'
          ? dictionary.verificationInvalidTitle
          : dictionary.verificationPendingTitle;
  const description =
    state === 'verified'
      ? dictionary.verificationSuccess
      : state === 'already'
        ? dictionary.verificationAlready
        : state === 'invalid'
          ? dictionary.verificationInvalid
          : query.delivery === 'failed'
            ? dictionary.verificationDeliveryFailed
            : query.sent === '1'
              ? dictionary.verificationSent
              : dictionary.verificationPending;
  return (
    <section className="mx-auto max-w-lg px-0 py-2 sm:py-4">
      <div className="auth-panel">
        <p className="mb-5 text-xs font-semibold tracking-[.2em] text-gray-500">Hdoors</p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
        <p className="text-gray-600">{description}</p>
        {state !== 'verified' && state !== 'already' ? (
          <ResendVerificationForm locale={locale} dictionary={dictionary} />
        ) : null}
      </div>
    </section>
  );
}
