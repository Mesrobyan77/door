'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { loginSchema } from '@/features/auth/schemas';
import { createSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { defaultLocale, isLocale, type Locale } from '@/lib/i18n/config';
import { getProviders } from '@/config/providers';
import {
  AUTH_RATE_LIMIT_POLICIES,
  enforceAuthRateLimit,
  getTrustedRequestOrigin,
} from '@/lib/auth/auth-rate-limit';

export type AuthActionState = { error?: 'INVALID' | 'RATE_LIMITED' | 'UNAVAILABLE' };

function resolveSafeNextPath(locale: Locale, raw: FormDataEntryValue | null): string {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) {
    return `/${locale}/profile`;
  }

  if (!raw.startsWith(`/${locale}/`)) {
    return `/${locale}/profile`;
  }

  return raw;
}

export async function loginAction(
  localeInput: string,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const locale: Locale = isLocale(localeInput) ? localeInput : defaultLocale;

  if (!parsed.success) {
    return { error: 'INVALID' };
  }
  const redis = getProviders().redis.getClient();
  const origin = await getTrustedRequestOrigin();
  const limits = await Promise.all([
    enforceAuthRateLimit(
      redis,
      'login-account',
      parsed.data.email,
      AUTH_RATE_LIMIT_POLICIES.loginAccount,
    ),
    enforceAuthRateLimit(redis, 'login-origin', origin, AUTH_RATE_LIMIT_POLICIES.loginOrigin),
  ]);
  if (limits.includes('limited')) return { error: 'RATE_LIMITED' };

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  const passwordMatches = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : false;

  if (!user || !passwordMatches || user.status !== 'ACTIVE') {
    return { error: 'INVALID' };
  }

  await getDb()
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await createSession(user.id);
  redirect(resolveSafeNextPath(locale, formData.get('next')));
}
