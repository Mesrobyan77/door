import type { EmailAdapter } from '@/lib/email/types';
import type { Locale } from '@/lib/i18n/config';
import type { RedisClient } from '@/lib/redis/types';

import { issueEmailVerificationToken } from '@/lib/auth/email-verification-tokens';

const RESEND_KEY_PREFIX = 'auth:verify:resend:';
/** A successful resend may be requested once per minute per account. */
export const EMAIL_VERIFICATION_RESEND_TTL_SECONDS = 60;

export function buildVerificationEmail(verificationUrl: string, locale: Locale) {
  const copy = {
    hy: {
      subject: 'Հաստատեք White Shop-ի էլ. փոստը',
      intro: 'Հաստատեք ձեր էլ. փոստը՝ White Shop հաշիվը ակտիվացնելու համար։',
      action: 'Հաստատել էլ. փոստը',
      expires: 'Հղումը վավեր է 24 ժամ։',
    },
    en: {
      subject: 'Verify your White Shop email',
      intro: 'Verify your email address to activate your White Shop account.',
      action: 'Verify email',
      expires: 'This link expires in 24 hours.',
    },
    ru: {
      subject: 'Подтвердите email White Shop',
      intro: 'Подтвердите email, чтобы активировать аккаунт White Shop.',
      action: 'Подтвердить email',
      expires: 'Ссылка действует 24 часа.',
    },
  }[locale];
  return {
    subject: copy.subject,
    text: `${copy.intro}\n\n${copy.action}: ${verificationUrl}\n\n${copy.expires}`,
    html: `<p>${copy.intro}</p><p><a href="${verificationUrl}">${copy.action}</a></p><p>${copy.expires}</p>`,
  };
}

export async function acquireVerificationResend(
  redis: RedisClient,
  userId: string,
): Promise<boolean> {
  return (
    (await redis.set(RESEND_KEY_PREFIX + userId, '1', {
      ex: EMAIL_VERIFICATION_RESEND_TTL_SECONDS,
      nx: true,
    })) === 'OK'
  );
}

export async function sendEmailVerification(input: {
  redis: RedisClient;
  email: EmailAdapter;
  userId: string;
  recipient: string;
  locale: Locale;
  appUrl: string;
}): Promise<void> {
  const rawToken = await issueEmailVerificationToken(input.redis, input.userId);
  const url = new URL(`/${input.locale}/verify-email`, input.appUrl);
  url.searchParams.set('token', rawToken);
  const message = buildVerificationEmail(url.toString(), input.locale);
  await input.email.send({ to: input.recipient, ...message });
}

/** Undo a resend cooldown after provider failure so the user can retry immediately. */
export async function releaseVerificationResend(redis: RedisClient, userId: string): Promise<void> {
  await redis.del(RESEND_KEY_PREFIX + userId);
}

/** Applies the resend limit and rolls it back when delivery fails. */
export async function resendEmailVerification(
  input: Parameters<typeof sendEmailVerification>[0],
): Promise<'sent' | 'rate_limited'> {
  if (!(await acquireVerificationResend(input.redis, input.userId))) {
    return 'rate_limited';
  }

  try {
    await sendEmailVerification(input);
    return 'sent';
  } catch (error) {
    await releaseVerificationResend(input.redis, input.userId);
    throw error;
  }
}
