import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

export const GUEST_CART_COOKIE_NAME = "ws_guest_cart";

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Reads the guest cart token without creating one (safe for GET/header paths). */
export async function peekGuestCartToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_CART_COOKIE_NAME)?.value ?? null;
}

/** Gets or initializes the opaque durable-cart owner token for guests. */
export async function getGuestCartToken(): Promise<string> {
  const existing = await peekGuestCartToken();
  if (existing) return existing;

  const cookieStore = await cookies();
  const token = randomBytes(32).toString("base64url");
  cookieStore.set(GUEST_CART_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}
