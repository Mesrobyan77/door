import {
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { products } from "@/db/schema/catalog";
import { createdAtColumn, idColumn } from "@/db/schema/columns";
import { stockMovementReasonEnum } from "@/db/schema/enums";
import { users } from "@/db/schema/identity";
import { orders } from "@/db/schema/orders";

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: idColumn(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    delta: integer("delta").notNull(),
    reason: stockMovementReasonEnum("reason").notNull(),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "restrict",
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resultingBalance: integer("resulting_balance").notNull(),
    correlationId: text("correlation_id"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("stock_movements_product_created_idx").on(
      table.productId,
      table.createdAt,
    ),
    index("stock_movements_order_idx").on(table.orderId),
  ],
);
