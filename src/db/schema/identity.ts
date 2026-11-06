import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  createdAtColumn,
  idColumn,
  updatedAtColumn,
} from "@/db/schema/columns";
import { userRoleEnum, userStatusEnum } from "@/db/schema/enums";

export const users = pgTable(
  "users",
  {
    id: idColumn(),
    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", {
      withTimezone: true,
      mode: "date",
    }),
    passwordHash: text("password_hash").notNull(),
    passwordUpdatedAt: timestamp("password_updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone"),
    role: userRoleEnum("role").notNull().default("CUSTOMER"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    termsAcceptedAt: timestamp("terms_accepted_at", {
      withTimezone: true,
      mode: "date",
    }),
    termsVersion: text("terms_version"),
    lastLoginAt: timestamp("last_login_at", {
      withTimezone: true,
      mode: "date",
    }),
    anonymizedAt: timestamp("anonymized_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("users_email_uidx").on(table.email),
    index("users_role_status_idx").on(table.role, table.status),
    index("users_created_at_idx").on(table.createdAt),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: idColumn(),
    sessionTokenHash: text("session_token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    lastActivityAt: timestamp("last_activity_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_uidx").on(table.sessionTokenHash),
    index("sessions_user_expires_idx").on(table.userId, table.expiresAt),
  ],
);

export const addresses = pgTable(
  "addresses",
  {
    id: idColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    label: text("label"),
    recipientFirstName: text("recipient_first_name").notNull(),
    recipientLastName: text("recipient_last_name").notNull(),
    phone: text("phone").notNull(),
    countryCode: text("country_code").notNull().default("AM"),
    region: text("region"),
    city: text("city").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    postalCode: text("postal_code"),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    isDefaultBilling: boolean("is_default_billing").notNull().default(false),
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("addresses_user_idx").on(table.userId),
    uniqueIndex("addresses_default_shipping_uidx")
      .on(table.userId)
      .where(
        sql`${table.isDefaultShipping} = true AND ${table.archivedAt} IS NULL`,
      ),
    uniqueIndex("addresses_default_billing_uidx")
      .on(table.userId)
      .where(
        sql`${table.isDefaultBilling} = true AND ${table.archivedAt} IS NULL`,
      ),
  ],
);
