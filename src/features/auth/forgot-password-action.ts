'use server';

import { eq } from 'drizzle-orm';

import { getEnv } from '@/config/env';
import { getProviders } from '@/config/providers';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { forgotPasswordSchema } from '@/features/auth/schemas';
import { issuePasswordResetToken } from '@/lib/auth/password-reset-tokens';
import { buildPasswordResetEmail } from '@/lib/auth/password-reset-email';
import {
  AUTH_RATE_LIMIT_POLICIES,
  enforceAuthRateLimit,
  getTrustedRequestOrigin,
} from '@/lib/auth/auth-rate-limit';
import { defaultLocale, isLocale, type Locale } from '@/lib/i18n/config';
import { logger } from '@/lib/observability/logger';

export type ForgotPasswordActionState = {
  error?: 'INVALID' | 'RATE_LIMITED' | 'UNAVAILABLE';
  sent?: boolean;
};

export async function forgotPasswordAction(
  localeInput: string,
  _previousState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const locale: Locale = isLocale(localeInput) ? localeInput : defaultLocale;
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  });

  if (!parsed.success) {
    return { error: 'INVALID' };
  }

  try {
    const providers = getProviders();
    const redis = providers.redis.getClient();
    const origin = await getTrustedRequestOrigin();
    const limits = await Promise.all([
      enforceAuthRateLimit(
        redis,
        'forgot-identity',
        parsed.data.email,
        AUTH_RATE_LIMIT_POLICIES.recoveryIdentity,
      ),
      enforceAuthRateLimit(redis, 'forgot-origin', origin, AUTH_RATE_LIMIT_POLICIES.recoveryOrigin),
    ]);
    if (limits.includes('limited')) return { error: 'RATE_LIMITED' };
    if (limits.includes('unavailable')) return { error: 'UNAVAILABLE' };
    const [user] = await getDb()
      .select({
        id: users.id,
        email: users.email,
        status: users.status,
        passwordUpdatedAt: users.passwordUpdatedAt,
      })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    if (user && user.status === 'ACTIVE') {
      const rawToken = await issuePasswordResetToken(redis, user.id, user.passwordUpdatedAt);
      const resetUrl = new URL(`/${locale}/reset-password`, getEnv().NEXT_PUBLIC_APP_URL);
      resetUrl.searchParams.set('token', rawToken);

      const email = buildPasswordResetEmail(resetUrl.toString(), locale);
      await providers.email.send({
        to: user.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    }
  } catch (error) {
    logger.error('auth.forgot_password_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    // Keep the public outcome generic; logs retain the operational failure.
    return { sent: true };
  }

  return { sent: true };
}
