"use server";

import { redirect } from "next/navigation";

import { destroySession } from "@/lib/auth/session";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

export async function logoutAction(locale: string): Promise<void> {
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  await destroySession();
  redirect(`/${safeLocale}`);
}
