import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/** Application-generated UUIDv7 primary key column helper. */
export const idColumn = () => uuid("id").primaryKey().notNull();

export const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`);

export const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`);

export const deletedAtColumn = () =>
  timestamp("deleted_at", { withTimezone: true, mode: "date" });
