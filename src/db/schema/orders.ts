import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { products } from "@/db/schema/catalog";
import {
  createdAtColumn,
  idColumn,
  updatedAtColumn,
} from "@/db/schema/columns";
import {
  orderEventTypeEnum,
  orderStatusEnum,
  paymentStatusEnum,
} from "@/db/schema/enums";
import { users } from "@/db/schema/identity";
import { deliveryRules, promotions } from "@/db/schema/pricing";

export type AddressSnapshot = {
  recipientFirstName: string;
  recipientLastName: string;
  phone: string;
  countryCode: string;
  region?: string;
  city: string;
  line1: string;
  line2?: string;
  postalCode?: string;
};

export const orders = pgTable(
  "orders",
  {
    id: idColumn(),
    orderNumber: text("order_number").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),
    contactName: text("contact_name").notNull(),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("PENDING"),
    isArchived: boolean("is_archived").notNull().default(false),
    baseCurrency: text("base_currency").notNull().default("AMD"),
    displayCurrency: text("display_currency").notNull().default("AMD"),
    exchangeRate: numeric("exchange_rate", { precision: 18, scale: 8 }),
    exchangeRateSource: text("exchange_rate_source"),
    exchangeRateAsOf: timestamp("exchange_rate_as_of", {
      withTimezone: true,
      mode: "date",
    }),
    subtotalAmount: integer("subtotal_amount").notNull(),
    discountAmount: integer("discount_amount").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
    deliveryAmount: integer("delivery_amount").notNull().default(0),
    totalAmount: integer("total_amount").notNull(),
    shippingAddress: jsonb("shipping_address").$type<AddressSnapshot>().notNull(),
    billingAddress: jsonb("billing_address").$type<AddressSnapshot>().notNull(),
    promotionId: uuid("promotion_id").references(() => promotions.id, {
      onDelete: "restrict",
    }),
    promotionCodeSnapshot: text("promotion_code_snapshot"),
    promotionTypeSnapshot: text("promotion_type_snapshot"),
    promotionValueSnapshot: integer("promotion_value_snapshot"),
    promotionDiscountAmount: integer("promotion_discount_amount"),
    deliveryRuleId: uuid("delivery_rule_id").references(() => deliveryRules.id, {
      onDelete: "restrict",
    }),
    deliveryLabelSnapshot: text("delivery_label_snapshot"),
    deliveryEstimateSnapshot: text("delivery_estimate_snapshot"),
    idempotencyScopeHash: text("idempotency_scope_hash").notNull(),
    idempotencyKeyHash: text("idempotency_key_hash").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    locale: text("locale").notNull(),
    correlationId: text("correlation_id"),
    placedAt: timestamp("placed_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .default(sql`now()`),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("orders_order_number_uidx").on(table.orderNumber),
    uniqueIndex("orders_idempotency_uidx").on(
      table.idempotencyScopeHash,
      table.idempotencyKeyHash,
      table.requestFingerprint,
    ),
    index("orders_user_placed_idx").on(table.userId, table.placedAt),
    index("orders_status_placed_idx").on(table.status, table.placedAt),
    index("orders_payment_status_placed_idx").on(
      table.paymentStatus,
      table.placedAt,
    ),
    index("orders_promotion_user_status_idx").on(
      table.promotionId,
      table.userId,
      table.status,
    ),
    check("orders_money_nonneg_chk", sql`${table.totalAmount} >= 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: idColumn(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "restrict",
    }),
    productTitleSnapshot: text("product_title_snapshot").notNull(),
    productSkuSnapshot: text("product_sku_snapshot").notNull(),
    productImageKeySnapshot: text("product_image_key_snapshot"),
    quantity: integer("quantity").notNull(),
    unitBaseAmount: integer("unit_base_amount").notNull(),
    unitDisplayAmount: integer("unit_display_amount").notNull(),
    compareAtAmount: integer("compare_at_amount"),
    discountAmount: integer("discount_amount").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
    lineTotalAmount: integer("line_total_amount").notNull(),
    currency: text("currency").notNull().default("AMD"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    index("order_items_product_idx").on(table.productId),
    check("order_items_qty_chk", sql`${table.quantity} > 0`),
  ],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: idColumn(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    eventType: orderEventTypeEnum("event_type").notNull(),
    fromState: text("from_state"),
    toState: text("to_state"),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    isCustomerVisible: boolean("is_customer_visible").notNull().default(false),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    providerEventId: text("provider_event_id"),
    correlationId: text("correlation_id"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("order_events_order_created_idx").on(table.orderId, table.createdAt),
    index("order_events_type_idx").on(table.eventType),
    uniqueIndex("order_events_provider_event_uidx")
      .on(table.providerEventId)
      .where(sql`${table.providerEventId} IS NOT NULL`),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: idColumn(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    method: text("method").notNull(),
    providerReference: text("provider_reference"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("AMD"),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    attemptNumber: integer("attempt_number").notNull().default(1),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("payments_order_attempt_idx").on(table.orderId, table.attemptNumber),
    index("payments_provider_ref_status_idx").on(
      table.providerReference,
      table.status,
    ),
    check("payments_amount_chk", sql`${table.amount} >= 0`),
    check("payments_attempt_chk", sql`${table.attemptNumber} > 0`),
  ],
);
