import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { blogPosts, heroSlides } from "@/db/schema/content";
import { categories, products } from "@/db/schema/catalog";
import {
  createdAtColumn,
  idColumn,
  updatedAtColumn,
} from "@/db/schema/columns";
import { mediaRoleEnum, mediaUploadStatusEnum } from "@/db/schema/enums";

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: idColumn(),
    objectKey: text("object_key").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    checksum: text("checksum"),
    uploadStatus: mediaUploadStatusEnum("upload_status")
      .notNull()
      .default("PENDING"),
    role: mediaRoleEnum("role").notNull().default("GALLERY"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    purpose: text("purpose"),
    altTranslations: jsonb("alt_translations").$type<
      Partial<Record<"hy" | "en" | "ru", string>>
    >(),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "restrict",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    heroSlideId: uuid("hero_slide_id").references(() => heroSlides.id, {
      onDelete: "restrict",
    }),
    blogPostId: uuid("blog_post_id").references(() => blogPosts.id, {
      onDelete: "restrict",
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("media_assets_object_key_uidx").on(table.objectKey),
    index("media_assets_product_idx").on(table.productId),
    index("media_assets_category_idx").on(table.categoryId),
    index("media_assets_hero_idx").on(table.heroSlideId),
    index("media_assets_blog_idx").on(table.blogPostId),
    uniqueIndex("media_assets_product_primary_uidx")
      .on(table.productId)
      .where(sql`${table.productId} IS NOT NULL AND ${table.isPrimary} = true`),
    uniqueIndex("media_assets_hero_desktop_uidx")
      .on(table.heroSlideId)
      .where(
        sql`${table.heroSlideId} IS NOT NULL AND ${table.role} = 'HERO_DESKTOP'`,
      ),
    uniqueIndex("media_assets_hero_mobile_uidx")
      .on(table.heroSlideId)
      .where(
        sql`${table.heroSlideId} IS NOT NULL AND ${table.role} = 'HERO_MOBILE'`,
      ),
    uniqueIndex("media_assets_blog_cover_uidx")
      .on(table.blogPostId)
      .where(
        sql`${table.blogPostId} IS NOT NULL AND ${table.role} = 'COVER'`,
      ),
    check(
      "media_assets_owner_chk",
      sql`(
        (${table.uploadStatus} = 'PENDING'
          AND ${table.productId} IS NULL
          AND ${table.categoryId} IS NULL
          AND ${table.heroSlideId} IS NULL
          AND ${table.blogPostId} IS NULL)
        OR (${table.role} = 'BRANDING' AND ${table.purpose} IS NOT NULL)
        OR (
          (${table.productId} IS NOT NULL)::int
          + (${table.categoryId} IS NOT NULL)::int
          + (${table.heroSlideId} IS NOT NULL)::int
          + (${table.blogPostId} IS NOT NULL)::int
        ) = 1
      )`,
    ),
    check("media_assets_byte_size_chk", sql`${table.byteSize} >= 0`),
  ],
);

export const storeSettings = pgTable(
  "store_settings",
  {
    key: text("key").primaryKey().notNull(),
    value: jsonb("value").$type<Record<string, unknown>>().notNull(),
    updatedAt: updatedAtColumn(),
  },
);
