'use server';

import { eq } from 'drizzle-orm';

import { getEnv } from '@/config/env';
import { getProviders } from '@/config/providers';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { resendEmailVerification } from '@/lib/auth/email-verification-delivery';
import { getCurrentUser } from '@/lib/auth/session';
import { defaultLocale, isLocale, type Locale } from '@/lib/i18n/config';
import { logger } from '@/lib/observability/logger';

export type ResendVerificationActionState = {
  error?: string;
  sent?: boolean;
  alreadyVerified?: boolean;
};

export async function resendVerificationAction(
  localeInput: string,
  _previous: ResendVerificationActionState,
): Promise<ResendVerificationActionState> {
  void _previous;
  const locale: Locale = isLocale(localeInput) ? localeInput : defaultLocale;
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return { error: 'SIGN_IN_REQUIRED' };

  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);
  if (!user || user.status !== 'ACTIVE') return { error: 'UNAVAILABLE' };
  if (user.emailVerifiedAt) return { alreadyVerified: true };

  const providers = getProviders();
  const redis = providers.redis.getClient();

  try {
    const result = await resendEmailVerification({
      redis,
      email: providers.email,
      userId: user.id,
      recipient: user.email,
      locale,
      appUrl: getEnv().NEXT_PUBLIC_APP_URL,
    });
    if (result === 'rate_limited') return { error: 'RATE_LIMITED' };
    return { sent: true };
  } catch (error) {
    logger.error('auth.verification_resend_failed', {
      error: error instanceof Error ? error.message : 'unknown',
      userId: user.id,
    });
    return { error: 'DELIVERY_FAILED' };
  }
}
