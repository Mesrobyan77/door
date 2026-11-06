import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

import { getDb } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { createId } from "@/lib/id";

const SESSION_COOKIE_NAME = "ws_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: "ADMIN" | "CUSTOMER";
  status: "ACTIVE" | "SUSPENDED" | "ANONYMIZED";
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

/** Creates an opaque, database-backed session and sets its cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  await getDb().insert(sessions).values({
    id: createId(),
    sessionTokenHash: hashToken(token),
    userId,
    expiresAt,
    lastActivityAt: now,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
}

/** Revokes the current session and clears its browser cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await getDb()
      .delete(sessions)
      .where(eq(sessions.sessionTokenHash, hashToken(token)));
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(new Date(0)),
    maxAge: 0,
  });
}

/** Revokes every session for the user (e.g. after password reset). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Revokes every session for the user except the caller's current browser session.
 * Used after credential changes so other devices must sign in again.
 */
export async function revokeOtherSessions(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    await getDb().delete(sessions).where(eq(sessions.userId, userId));
    return;
  }

  await getDb()
    .delete(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        ne(sessions.sessionTokenHash, hashToken(token)),
      ),
    );
}

/**
 * Resolves the active session and user from the opaque session cookie.
 * Request-scoped via React.cache so layout/header/pages share one DB round-trip.
 */
export const getCurrentSession = cache(
  async (): Promise<SessionUser | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const [result] = await getDb()
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.sessionTokenHash, hashToken(token)),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!result) {
      return null;
    }

    return result.user;
  },
);

export const getCurrentUser = getCurrentSession;
