/**
 * Canonical application tables from docs/03-DATA-MODEL.md.
 * Infrastructure table `app_meta` is intentionally excluded.
 */
export const CANONICAL_TABLES = [
  "users",
  "sessions",
  "addresses",
  "media_assets",
  "store_settings",
  "products",
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
] as const;

export type CanonicalTable = (typeof CANONICAL_TABLES)[number];

export const CANONICAL_TABLE_COUNT = CANONICAL_TABLES.length;
