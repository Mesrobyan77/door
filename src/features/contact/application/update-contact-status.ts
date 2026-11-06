"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auditLogs, contactMessages } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import {
  canTransitionContactStatus,
  isContactStatus,
  type ContactStatus,
} from "@/features/contact/domain/contact-rules";
import {
  updateContactStatusSchema,
  type UpdateContactStatusInput,
} from "@/features/contact/schemas/contact";
import { requireAdmin } from "@/lib/auth/policies";
import { createId } from "@/lib/id";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

/** Admin inbox status transition with audit. */
export async function updateContactStatusAction(
  locale: string,
  raw: UpdateContactStatusInput,
): Promise<Result<{ id: string; status: ContactStatus }>> {
  if (!isLocale(locale)) {
    return err("INVALID_LOCALE", "Invalid locale.");
  }

  const parsed = updateContactStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid status payload.");
  }

  const actor = await requireAdmin(locale as Locale);

  try {
    const result = await withTransaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(contactMessages)
        .where(eq(contactMessages.id, parsed.data.messageId))
        .for("update")
        .limit(1);

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      if (!isContactStatus(existing.status)) {
        throw new Error("INVALID_STATUS");
      }

      if (existing.status === parsed.data.status) {
        throw new Error("SAME_STATUS");
      }

      if (!canTransitionContactStatus(existing.status, parsed.data.status)) {
        throw new Error("INVALID_TRANSITION");
      }

      await tx
        .update(contactMessages)
        .set({ status: parsed.data.status, updatedAt: new Date() })
        .where(eq(contactMessages.id, existing.id));

      await tx.insert(auditLogs).values({
        id: createId(),
        actorUserId: actor.id,
        action: "contact.change_status",
        targetType: "contact_message",
        targetId: existing.id,
        beforeDiff: { status: existing.status },
        afterDiff: { status: parsed.data.status },
        correlationId: createId(),
      });

      return { id: existing.id, status: parsed.data.status };
    });

    revalidatePath(`/${locale}/admin/messages`);
    revalidatePath(`/${locale}/admin/messages/${result.id}`);
    return ok(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    switch (code) {
      case "NOT_FOUND":
        return err("NOT_FOUND", "Message not found.");
      case "SAME_STATUS":
        return err("SAME_STATUS", "Message already has this status.");
      case "INVALID_TRANSITION":
        return err(
          "INVALID_TRANSITION",
          "That status transition is not allowed.",
        );
      default:
        return err("CONTACT_UPDATE_FAILED", "Unable to update message.");
    }
  }
}
