"use server";

import { and, count, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db/client";
import {
  addresses,
  auditLogs,
  carts,
  sessions,
  users,
  wishlistItems,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  isUserRole,
  isUserStatus,
  wouldRemoveLastActiveAdmin,
} from "@/features/users/domain/user-lifecycle";
import { requireUser } from "@/lib/auth/policies";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroySession } from "@/lib/auth/session";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";

export type DeleteAccountActionState = {
  error?: string;
};

const deleteAccountSchema = z.object({
  password: z.string().min(1),
  acknowledged: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .transform((value) => value === true || value === "on" || value === "true"),
});

/**
 * Self-service account deletion: re-auth with password, anonymize PII,
 * clear ephemeral profile data, revoke sessions, then sign the user out.
 * Order/financial snapshots are retained.
 */
export async function deleteAccountAction(
  locale: string,
  _previousState: DeleteAccountActionState,
  formData: FormData,
): Promise<DeleteAccountActionState> {
  if (!isLocale(locale)) {
    return { error: "Invalid locale." };
  }

  const user = await requireUser(locale as Locale);
  const parsed = deleteAccountSchema.safeParse({
    password: formData.get("password"),
    acknowledged: formData.get("acknowledged") ?? false,
  });

  if (!parsed.success || !parsed.data.acknowledged) {
    return {
      error: "Confirm the acknowledgment and enter your password to continue.",
    };
  }

  const [row] = await getDb()
    .select({
      id: users.id,
      role: users.role,
      status: users.status,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!row || !isUserRole(row.role) || !isUserStatus(row.status)) {
    return { error: "Unable to delete account." };
  }

  if (row.status !== "ACTIVE") {
    return { error: "This account cannot be deleted." };
  }

  const passwordMatches = await verifyPassword(
    parsed.data.password,
    row.passwordHash,
  );
  if (!passwordMatches) {
    return { error: "Current password is incorrect." };
  }

  try {
    const scrambledPassword = await hashPassword(createId());

    await withTransaction(async (tx) => {
      const [activeAdmins] = await tx
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.role, "ADMIN"), eq(users.status, "ACTIVE")));

      if (
        wouldRemoveLastActiveAdmin({
          targetRole: row.role,
          targetStatus: row.status,
          nextRole: row.role,
          nextStatus: "ANONYMIZED",
          activeAdminCount: activeAdmins?.value ?? 0,
        })
      ) {
        throw new Error("LAST_ADMIN");
      }

      const now = new Date();
      const correlationId = createId();

      await tx
        .update(users)
        .set({
          status: "ANONYMIZED",
          anonymizedAt: now,
          email: `anonymized+${row.id}@invalid.local`,
          firstName: "Anonymized",
          lastName: "User",
          phone: null,
          passwordHash: scrambledPassword,
          passwordUpdatedAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, row.id));

      await tx
        .update(addresses)
        .set({
          archivedAt: now,
          isDefaultShipping: false,
          isDefaultBilling: false,
          updatedAt: now,
        })
        .where(
          and(eq(addresses.userId, row.id), isNull(addresses.archivedAt)),
        );

      await tx
        .update(carts)
        .set({ status: "ABANDONED", updatedAt: now })
        .where(and(eq(carts.userId, row.id), eq(carts.status, "ACTIVE")));

      await tx
        .delete(wishlistItems)
        .where(eq(wishlistItems.userId, row.id));

      await tx.delete(sessions).where(eq(sessions.userId, row.id));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: row.id,
        action: "user.self_delete",
        targetType: "user",
        targetId: row.id,
        beforeDiff: { status: row.status },
        afterDiff: { status: "ANONYMIZED" },
        correlationId,
        context: { selfService: true },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_ADMIN") {
      return {
        error: "The last active admin account cannot be deleted.",
      };
    }
    return { error: "Unable to delete account. Please try again." };
  }

  await destroySession();
  redirect(`/${locale}`);
}
