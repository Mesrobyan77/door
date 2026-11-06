"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auditLogs, sessions, users } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  getEligibleUserStatuses,
  isUserRole,
  isUserStatus,
  shouldRevokeSessions,
  wouldRemoveLastActiveAdmin,
  type UserRole,
  type UserStatus,
} from "@/features/users/domain/user-lifecycle";
import {
  updateUserRoleSchema,
  updateUserStatusSchema,
  bulkAnonymizeUsersSchema,
  type UpdateUserRoleInput,
  type UpdateUserStatusInput,
  type BulkAnonymizeUsersInput,
} from "@/features/users/schemas/admin-users";
import { requireAdmin } from "@/lib/auth/policies";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

async function countActiveAdmins(
  tx: Parameters<Parameters<typeof withTransaction>[0]>[0],
): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.role, "ADMIN"), eq(users.status, "ACTIVE")));

  return row?.value ?? 0;
}

/**
 * Admin role change with last-active-admin guard, audit, and session revoke on demotion.
 */
export async function updateUserRoleAction(
  locale: string,
  raw: UpdateUserRoleInput,
): Promise<Result<{ userId: string; role: UserRole }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = updateUserRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid role change payload.");
  }

  const actor = await requireAdmin(locale as Locale);
  const { userId, role: nextRole } = parsed.data;

  try {
    const result = await withTransaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for("update")
        .limit(1);

      if (!target) {
        throw new Error("USER_NOT_FOUND");
      }

      if (!isUserRole(target.role) || !isUserStatus(target.status)) {
        throw new Error("INVALID_USER_STATE");
      }

      if (target.status === "ANONYMIZED") {
        throw new Error("USER_ANONYMIZED");
      }

      if (target.role === nextRole) {
        throw new Error("SAME_ROLE");
      }

      const activeAdminCount = await countActiveAdmins(tx);

      if (
        wouldRemoveLastActiveAdmin({
          targetRole: target.role,
          targetStatus: target.status,
          nextRole,
          nextStatus: target.status,
          activeAdminCount,
        })
      ) {
        throw new Error("LAST_ADMIN");
      }

      const now = new Date();
      const correlationId = createId();

      await tx
        .update(users)
        .set({ role: nextRole, updatedAt: now })
        .where(eq(users.id, target.id));

      if (
        shouldRevokeSessions({
          fromRole: target.role,
          fromStatus: target.status,
          toRole: nextRole,
          toStatus: target.status,
        })
      ) {
        await tx.delete(sessions).where(eq(sessions.userId, target.id));
      }

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "user.change_role",
        targetType: "user",
        targetId: target.id,
        beforeDiff: { role: target.role },
        afterDiff: { role: nextRole },
        correlationId,
        context: { actorId: actor.id },
      });

      return { userId: target.id, role: nextRole };
    });

    revalidatePath(`/${locale}/admin/users`);
    revalidatePath(`/${locale}/admin/users/${userId}`);
    return ok(result);
  } catch (error) {
    return mapUserMutationError(error);
  }
}

/**
 * Admin status change with last-active-admin guard, audit, and session revoke.
 */
export async function updateUserStatusAction(
  locale: string,
  raw: UpdateUserStatusInput,
): Promise<Result<{ userId: string; status: UserStatus }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = updateUserStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid status change payload.");
  }

  const actor = await requireAdmin(locale as Locale);
  const { userId, status: nextStatus } = parsed.data;

  try {
    const result = await withTransaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for("update")
        .limit(1);

      if (!target) {
        throw new Error("USER_NOT_FOUND");
      }

      if (!isUserRole(target.role) || !isUserStatus(target.status)) {
        throw new Error("INVALID_USER_STATE");
      }

      if (target.status === nextStatus) {
        throw new Error("SAME_STATUS");
      }

      const eligible = getEligibleUserStatuses(target.status);
      if (!eligible.includes(nextStatus)) {
        throw new Error("INVALID_TRANSITION");
      }

      const activeAdminCount = await countActiveAdmins(tx);

      if (
        wouldRemoveLastActiveAdmin({
          targetRole: target.role,
          targetStatus: target.status,
          nextRole: target.role,
          nextStatus,
          activeAdminCount,
        })
      ) {
        throw new Error("LAST_ADMIN");
      }

      const now = new Date();
      const correlationId = createId();
      const anonymizedAt =
        nextStatus === "ANONYMIZED" ? now : target.anonymizedAt;

      await tx
        .update(users)
        .set({
          status: nextStatus,
          anonymizedAt,
          updatedAt: now,
          ...(nextStatus === "ANONYMIZED"
            ? {
                email: `anonymized+${target.id}@invalid.local`,
                firstName: "Anonymized",
                lastName: "User",
                phone: null,
              }
            : {}),
        })
        .where(eq(users.id, target.id));

      if (
        shouldRevokeSessions({
          fromRole: target.role,
          fromStatus: target.status,
          toRole: target.role,
          toStatus: nextStatus,
        })
      ) {
        await tx.delete(sessions).where(eq(sessions.userId, target.id));
      }

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "user.change_status",
        targetType: "user",
        targetId: target.id,
        beforeDiff: { status: target.status },
        afterDiff: { status: nextStatus },
        correlationId,
        context: { actorId: actor.id },
      });

      return { userId: target.id, status: nextStatus };
    });

    revalidatePath(`/${locale}/admin/users`);
    revalidatePath(`/${locale}/admin/users/${userId}`);
    return ok(result);
  } catch (error) {
    return mapUserMutationError(error);
  }
}

/**
 * Soft-deletes users by anonymizing them (PII wipe + ANONYMIZED status).
 */
export async function bulkAnonymizeUsersAction(
  locale: string,
  raw: BulkAnonymizeUsersInput,
): Promise<Result<{ anonymized: number; skipped: number }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = bulkAnonymizeUsersSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid user selection.");
  }

  let anonymized = 0;
  let skipped = 0;

  for (const userId of parsed.data.userIds) {
    const result = await updateUserStatusAction(locale, {
      userId,
      status: "ANONYMIZED",
    });
    if (result.ok) {
      anonymized += 1;
    } else {
      skipped += 1;
    }
  }

  return ok({ anonymized, skipped });
}

function mapUserMutationError(error: unknown): Result<never> {
  const code = error instanceof Error ? error.message : "UNKNOWN";

  switch (code) {
    case "USER_NOT_FOUND":
      return err("USER_NOT_FOUND", "User not found.");
    case "SAME_ROLE":
      return err("SAME_ROLE", "User already has this role.");
    case "SAME_STATUS":
      return err("SAME_STATUS", "User already has this status.");
    case "LAST_ADMIN":
      return err(
        "LAST_ADMIN",
        "Cannot remove or disable the last active admin.",
      );
    case "USER_ANONYMIZED":
      return err("USER_ANONYMIZED", "Anonymized users cannot be changed.");
    case "INVALID_TRANSITION":
      return err("INVALID_TRANSITION", "That status transition is not allowed.");
    case "INVALID_USER_STATE":
      return err("INVALID_USER_STATE", "User has an unknown role or status.");
    default:
      return err("USER_UPDATE_FAILED", "Unable to update user.");
  }
}
