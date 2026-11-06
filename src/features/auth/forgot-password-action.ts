"use server";

import { eq } from "drizzle-orm";

import { getEnv } from "@/config/env";
import { getProviders } from "@/config/providers";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { issuePasswordResetToken } from "@/lib/auth/password-reset-tokens";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { logger } from "@/lib/observability/logger";

export type ForgotPasswordActionState = {
  error?: string;
  sent?: boolean;
};

function buildResetEmail(resetUrl: string) {
  const text = [
    "We received a request to reset your White Shop password.",
    "",
    "Open this link to choose a new password (expires in 1 hour):",
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>We received a request to reset your White Shop password.</p>
    <p><a href="${resetUrl}">Choose a new password</a> (link expires in 1 hour).</p>
    <p>If you did not request this, you can ignore this email.</p>
  `.trim();

  return {
    subject: "Reset your White Shop password",
    text,
    html,
  };
}

export async function forgotPasswordAction(
  localeInput: string,
  _previousState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const locale: Locale = isLocale(localeInput) ? localeInput : defaultLocale;
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "Please enter a valid email address." };
  }

  try {
    const [user] = await getDb()
      .select({ id: users.id, email: users.email, status: users.status })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    if (user && user.status === "ACTIVE") {
      const providers = getProviders();
      const rawToken = await issuePasswordResetToken(
        providers.redis.getClient(),
        user.id,
      );
      const resetUrl = new URL(
        `/${locale}/reset-password`,
        getEnv().NEXT_PUBLIC_APP_URL,
      );
      resetUrl.searchParams.set("token", rawToken);

      const email = buildResetEmail(resetUrl.toString());
      await providers.email.send({
        to: user.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    }
  } catch (error) {
    logger.error("auth.forgot_password_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      error: "Unable to process the request right now. Please try again.",
    };
  }

  return { sent: true };
}
