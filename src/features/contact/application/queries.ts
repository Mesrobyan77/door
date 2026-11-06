import "server-only";

import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { getDb } from "@/db/client";
import { contactMessages } from "@/db/schema";
import type { AdminContactFilter } from "@/features/contact/schemas/contact";

const PAGE_SIZE = 20;

export type AdminContactListItem = {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: string;
  spamScore: number | null;
  createdAt: Date;
};

/** Lists contact messages for the admin inbox. */
export async function listAdminContactMessages(
  filters: AdminContactFilter,
): Promise<{
  rows: AdminContactListItem[];
  total: number;
  pageSize: number;
}> {
  const conditions: SQL[] = [];

  if (filters.status) {
    conditions.push(eq(contactMessages.status, filters.status));
  }

  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(contactMessages.name, pattern),
        ilike(contactMessages.email, pattern),
        ilike(contactMessages.subject, pattern),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (filters.page - 1) * PAGE_SIZE;

  const [rows, [totalRow]] = await Promise.all([
    getDb()
      .select({
        id: contactMessages.id,
        name: contactMessages.name,
        email: contactMessages.email,
        subject: contactMessages.subject,
        status: contactMessages.status,
        spamScore: contactMessages.spamScore,
        createdAt: contactMessages.createdAt,
      })
      .from(contactMessages)
      .where(where)
      .orderBy(desc(contactMessages.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    getDb().select({ value: count() }).from(contactMessages).where(where),
  ]);

  return {
    rows,
    total: totalRow?.value ?? 0,
    pageSize: PAGE_SIZE,
  };
}

/** Loads one contact message by id. */
export async function getAdminContactMessageById(id: string) {
  const [row] = await getDb()
    .select()
    .from(contactMessages)
    .where(eq(contactMessages.id, id))
    .limit(1);

  return row ?? null;
}
