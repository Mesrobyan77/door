"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { type AuthActionState } from "@/features/auth/login-action";
import { registerSchema } from "@/features/auth/schemas";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { createId } from "@/lib/id";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

export async function registerAction(
  localeInput: string,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  const locale: Locale = isLocale(localeInput) ? localeInput : defaultLocale;

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid registration details." };
  }

  const [existingUser] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existingUser) {
    return { error: "Unable to create account with those details." };
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
      // Temporary Phase 3 bypass until the verification provider is connected.
      emailVerifiedAt: new Date(),
      role: "CUSTOMER",
      status: "ACTIVE",
    })
    .returning({ id: users.id });

  if (!user) {
    return { error: "Unable to create account with those details." };
  }

  await createSession(user.id);
  redirect(`/${locale}/profile`);
}
