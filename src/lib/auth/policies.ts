import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

/** Requires an active authenticated user for a protected server flow. */
export async function requireUser(locale: Locale): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user || user.status !== "ACTIVE") {
    redirect(`/${locale}/login`);
  }

  return user;
}

/** Requires an active administrator for a protected server flow. */
export async function requireAdmin(locale: Locale): Promise<SessionUser> {
  const user = await requireUser(locale);

  if (user.role !== "ADMIN") {
    redirect(`/${locale}`);
  }

  return user;
}
