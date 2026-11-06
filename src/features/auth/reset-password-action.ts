"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getProviders } from "@/config/providers";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { resetPasswordSchema } from "@/features/auth/schemas";
import { hashPassword } from "@/lib/auth/password";
import { consumePasswordResetToken } from "@/lib/auth/password-reset-tokens";
import {
  destroySession,
  revokeAllSessions,
} from "@/lib/auth/session";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { logger } from "@/lib/observability/logger";

export type ResetPasswordActionState = {
  error?: string;
};

export async function resetPasswordAction(
  localeInput: string,
  _previousState: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  const locale: Locale = isLocale(localeInput) ? localeInput : defaultLocale;
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Please check the password fields and try again.",
    };
  }

  try {
    const redis = getProviders().redis.getClient();
    const userId = await consumePasswordResetToken(redis, parsed.data.token);

    if (!userId) {
      return {
        error: "This reset link is invalid or has expired. Request a new one.",
      };
    }

    const [user] = await getDb()
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.status !== "ACTIVE") {
      return {
        error: "This reset link is invalid or has expired. Request a new one.",
      };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const now = new Date();

    await getDb()
      .update(users)
      .set({
        passwordHash,
        passwordUpdatedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    await revokeAllSessions(user.id);
    await destroySession();
  } catch (error) {
    logger.error("auth.reset_password_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      error: "Unable to reset the password right now. Please try again.",
    };
  }

  redirect(`/${locale}/login?reset=1`);
}
