'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { sendEmailVerification } from '@/lib/auth/email-verification-delivery';
import { type AuthActionState } from '@/features/auth/login-action';
import { registerSchema } from '@/features/auth/schemas';
import { createSession } from '@/lib/auth/session';
import { getEnv } from '@/config/env';
import { getProviders } from '@/config/providers';
import { hashPassword } from '@/lib/auth/password';
import { createId } from '@/lib/id';
import { defaultLocale, isLocale, type Locale } from '@/lib/i18n/config';

export async function registerAction(
  localeInput: string,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  const locale: Locale = isLocale(localeInput) ? localeInput : defaultLocale;

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid registration details.' };
  }

  const [existingUser] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existingUser) {
    return { error: 'Unable to create account with those details.' };
  }

  const { firstName, lastName, email, phone, password } = parsed.data;
  const [user] = await getDb()
    .insert(users)
    .values({
      id: createId(),
      firstName,
      lastName,
      email,
      phone,
      passwordHash: await hashPassword(password),
      passwordUpdatedAt: new Date(),
      role: 'CUSTOMER',
      status: 'ACTIVE',
    })
    .returning({ id: users.id });

  if (!user) {
    return { error: 'Unable to create account with those details.' };
  }

  await createSession(user.id);
  let delivered = false;
  try {
    const providers = getProviders();
    await sendEmailVerification({
      redis: providers.redis.getClient(),
      email: providers.email,
      userId: user.id,
      recipient: email,
      locale,
      appUrl: getEnv().NEXT_PUBLIC_APP_URL,
    });
    delivered = true;
  } catch {
    // The account and session intentionally remain usable for retrying delivery.
  }

  redirect(
    delivered ? `/${locale}/verify-email?sent=1` : `/${locale}/verify-email?delivery=failed`,
  );
}
