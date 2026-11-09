'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { getProviders } from '@/config/providers';
import { sessions, users } from '@/db/schema';
import { withTransaction } from '@/db/transaction';
import { resetPasswordSchema } from '@/features/auth/schemas';
import { hashPassword } from '@/lib/auth/password';
import {
  claimPasswordResetToken,
  finalizePasswordResetClaim,
  releasePasswordResetClaim,
} from '@/lib/auth/password-reset-tokens';
import { clearSessionCookie } from '@/lib/auth/session';
import {
  AUTH_RATE_LIMIT_POLICIES,
  enforceAuthRateLimit,
  getTrustedRequestOrigin,
} from '@/lib/auth/auth-rate-limit';
import { defaultLocale, isLocale, type Locale } from '@/lib/i18n/config';
import { logger } from '@/lib/observability/logger';

export type ResetPasswordActionState = {
  error?: 'INVALID' | 'POLICY' | 'RATE_LIMITED' | 'UNAVAILABLE';
};

export async function resetPasswordAction(
  localeInput: string,
  _previousState: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  const locale: Locale = isLocale(localeInput) ? localeInput : defaultLocale;
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      error: formData.get('token') ? 'POLICY' : 'INVALID',
    };
  }

  try {
    const redis = getProviders().redis.getClient();
    const origin = await getTrustedRequestOrigin();
    const limits = await Promise.all([
      enforceAuthRateLimit(
        redis,
        'reset-token',
        parsed.data.token,
        AUTH_RATE_LIMIT_POLICIES.recoveryIdentity,
      ),
      enforceAuthRateLimit(redis, 'reset-origin', origin, AUTH_RATE_LIMIT_POLICIES.recoveryOrigin),
    ]);
    if (limits.includes('limited')) return { error: 'RATE_LIMITED' };
    if (limits.includes('unavailable')) return { error: 'UNAVAILABLE' };
    const claim = await claimPasswordResetToken(redis, parsed.data.token);
    if (!claim) return { error: 'INVALID' };
    const passwordHash = await hashPassword(parsed.data.password);
    const now = new Date();
    try {
      await withTransaction(async (tx) => {
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, claim.userId))
          .for('update')
          .limit(1);
        if (
          !user ||
          user.status !== 'ACTIVE' ||
          user.passwordUpdatedAt.toISOString() !== claim.passwordVersion
        )
          throw new Error('INVALID_RESET');
        await tx
          .update(users)
          .set({ passwordHash, passwordUpdatedAt: now, updatedAt: now })
          .where(eq(users.id, user.id));
        await tx.delete(sessions).where(eq(sessions.userId, user.id));
      });
    } catch (error) {
      await releasePasswordResetClaim(redis, claim);
      if (error instanceof Error && error.message === 'INVALID_RESET') return { error: 'INVALID' };
      throw error;
    }
    try {
      await finalizePasswordResetClaim(redis, claim);
    } catch (error) {
      logger.error('auth.reset_token_finalize_failed', {
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
    await clearSessionCookie();
  } catch (error) {
    logger.error('auth.reset_password_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return {
      error: 'UNAVAILABLE',
    };
  }

  redirect(`/${locale}/login?reset=1`);
}
