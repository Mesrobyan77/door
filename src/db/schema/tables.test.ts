import { describe, expect, it } from "vitest";

import { CANONICAL_TABLE_COUNT, CANONICAL_TABLES } from "@/db/schema/tables";

describe("canonical table inventory", () => {
  it("contains exactly 26 unique application tables", () => {
    expect(CANONICAL_TABLE_COUNT).toBe(26);
    expect(new Set(CANONICAL_TABLES).size).toBe(26);
    expect([...CANONICAL_TABLES]).toEqual([
      "users",
      "sessions",
      "addresses",
      "media_assets",
      "store_settings",
      "products",
      "product_variants",
      "categories",
      "product_categories",
      "stock_movements",
      "hero_slides",
      "blog_posts",
      "carts",
      "cart_items",
      "wishlist_items",
      "promotions",
      "promotion_users",
      "delivery_rules",
      "orders",
      "order_items",
      "order_events",
      "payments",
      "reviews",
      "contact_messages",
      "audit_logs",
      "outbox_events",
    ]);
  });
});
