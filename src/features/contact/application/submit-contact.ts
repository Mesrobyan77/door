"use server";

import { createHash } from "node:crypto";

import { and, desc, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getProviders } from "@/config/providers";
import { getDb } from "@/db/client";
import { contactMessages } from "@/db/schema";
import {
  normalizeContactEmail,
  scoreContactSpam,
} from "@/features/contact/domain/contact-rules";
import {
  submitContactSchema,
  type SubmitContactInput,
} from "@/features/contact/schemas/contact";
import { createId } from "@/lib/id";
import { locales } from "@/lib/i18n/config";
import { err, ok, type Result } from "@/lib/result";

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
/** Max contact submissions per email per window (documented Phase 9 default). */
const CONTACT_RATE_LIMIT = 5;
const CONTACT_RATE_WINDOW_SECONDS = 15 * 60;

function revalidateContactInbox(): void {
  for (const locale of locales) {
    revalidatePath(`/${locale}/admin/messages`);
  }
}

/**
 * Public contact form submission with spam scoring and
 * short-window duplicate suppression by email+message preview.
 */
export async function submitContactMessageAction(
  raw: SubmitContactInput,
): Promise<Result<{ id: string }>> {
  const parsed = submitContactSchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Please check the form fields.");
  }

  const data = parsed.data;
  const message = data.message.trim();
  /** Stored for admin inbox; form no longer collects a separate subject. */
  const subject = message.slice(0, 160);
  const spamScore = scoreContactSpam({
    name: data.name,
    email: data.email,
    phone: data.phone,
    subject,
    message,
    companyWebsite: data.companyWebsite,
  });

  const email = normalizeContactEmail(data.email);
  const rateKey = `contact:rate:${createHash("sha256").update(email).digest("hex")}`;
  const redis = getProviders().redis.getClient();
  const currentRaw = await redis.get(rateKey);
  const currentCount = currentRaw ? Number.parseInt(currentRaw, 10) : 0;
  if (Number.isFinite(currentCount) && currentCount >= CONTACT_RATE_LIMIT) {
    return err("RATE_LIMITED", "Too many messages. Please try again later.");
  }

  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);

  const [duplicate] = await getDb()
    .select({ id: contactMessages.id })
    .from(contactMessages)
    .where(
      and(
        eq(contactMessages.email, email),
        eq(contactMessages.subject, subject),
        gt(contactMessages.createdAt, since),
      ),
    )
    .orderBy(desc(contactMessages.createdAt))
    .limit(1);

  if (duplicate) {
    return ok({ id: duplicate.id });
  }

  try {
    const id = createId();
    await getDb().insert(contactMessages).values({
      id,
      name: data.name.trim(),
      email,
      phone: data.phone?.trim() || null,
      subject,
      message,
      status: "UNREAD",
      spamScore,
    });

    const nextCount = (Number.isFinite(currentCount) ? currentCount : 0) + 1;
    await redis.set(rateKey, String(nextCount), {
      ex: CONTACT_RATE_WINDOW_SECONDS,
    });

    revalidateContactInbox();
    return ok({ id });
  } catch {
    return err("CONTACT_SUBMIT_FAILED", "Unable to send your message.");
  }
}
