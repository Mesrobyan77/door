import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { categories, products } from "@/db/schema/catalog";
import {
  createdAtColumn,
  idColumn,
  updatedAtColumn,
} from "@/db/schema/columns";
import { discountTypeEnum, promotionKindEnum } from "@/db/schema/enums";
import { users } from "@/db/schema/identity";

export const promotions = pgTable(
  "promotions",
  {
    id: idColumn(),
    kind: promotionKindEnum("kind").notNull(),
    code: text("code"),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "restrict",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    discountType: discountTypeEnum("discount_type").notNull(),
    discountValue: integer("discount_value").notNull(),
    maxDiscountAmount: integer("max_discount_amount"),
    minimumOrderAmount: integer("minimum_order_amount"),
    totalUsageLimit: integer("total_usage_limit"),
    perUserUsageLimit: integer("per_user_usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
    isActive: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    allowStacking: boolean("allow_stacking").notNull().default(false),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("promotions_code_uidx")
      .on(table.code)
      .where(sql`${table.code} IS NOT NULL`),
    index("promotions_active_dates_idx").on(
      table.isActive,
      table.startsAt,
      table.endsAt,
    ),
    index("promotions_product_idx").on(table.productId),
    index("promotions_category_idx").on(table.categoryId),
    check(
      "promotions_kind_chk",
      sql`(
        (${table.kind} = 'COUPON' AND ${table.code} IS NOT NULL)
        OR (
          ${table.kind} = 'AUTOMATIC'
          AND ${table.code} IS NULL
          AND (
            (${table.productId} IS NOT NULL AND ${table.categoryId} IS NULL)
            OR (${table.productId} IS NULL AND ${table.categoryId} IS NOT NULL)
          )
        )
      )`,
    ),
    check(
      "promotions_single_target_chk",
      sql`NOT (${table.productId} IS NOT NULL AND ${table.categoryId} IS NOT NULL)`,
    ),
    check("promotions_value_chk", sql`${table.discountValue} > 0`),
    check("promotions_used_chk", sql`${table.usedCount} >= 0`),
  ],
);

export const promotionUsers = pgTable(
  "promotion_users",
  {
    id: idColumn(),
    promotionId: uuid("promotion_id")
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("promotion_users_uidx").on(table.promotionId, table.userId),
  ],
);

export const deliveryRules = pgTable(
  "delivery_rules",
  {
    id: idColumn(),
    countryCode: text("country_code").notNull().default("AM"),
    region: text("region"),
    city: text("city"),
    priceAmount: integer("price_amount").notNull(),
    freeThresholdAmount: integer("free_threshold_amount"),
    estimatedDaysMin: integer("estimated_days_min"),
    estimatedDaysMax: integer("estimated_days_max"),
    isActive: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("delivery_rules_match_idx").on(
      table.isActive,
      table.countryCode,
      table.region,
      table.city,
      table.priority,
    ),
    check("delivery_rules_price_chk", sql`${table.priceAmount} >= 0`),
  ],
);
