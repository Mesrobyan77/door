import { pgTable, text } from "drizzle-orm/pg-core";

import { updatedAtColumn } from "@/db/schema/columns";

/**
 * Bootstrap table for Phase 1 migration workflow validation.
 * Canonical 25-table catalog schema lands in Phase 2.
 */
export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey().notNull(),
  value: text("value").notNull(),
  updatedAt: updatedAtColumn(),
});
