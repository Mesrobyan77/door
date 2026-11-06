import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  createdAtColumn,
  deletedAtColumn,
  idColumn,
  updatedAtColumn,
} from "@/db/schema/columns";
import { blogPostStatusEnum } from "@/db/schema/enums";
import { users } from "@/db/schema/identity";

export type HeroTranslation = {
  title: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonUrl?: string;
};

export type HeroTranslationsJson = Partial<
  Record<"hy" | "en" | "ru", HeroTranslation>
>;

export type BlogTranslation = {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type BlogTranslationsJson = Partial<
  Record<"hy" | "en" | "ru", BlogTranslation>
>;

export const heroSlides = pgTable(
  "hero_slides",
  {
    id: idColumn(),
    translations: jsonb("translations").$type<HeroTranslationsJson>().notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("hero_slides_active_sort_idx").on(table.isActive, table.sortOrder),
  ],
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: idColumn(),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: blogPostStatusEnum("status").notNull().default("DRAFT"),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "date",
    }),
    translations: jsonb("translations").$type<BlogTranslationsJson>().notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (table) => [
    index("blog_posts_status_published_idx").on(
      table.status,
      table.publishedAt,
    ),
    uniqueIndex("blog_posts_slug_hy_uidx")
      .on(sql`(${table.translations}->'hy'->>'slug')`)
      .where(sql`${table.translations}->'hy'->>'slug' IS NOT NULL`),
    uniqueIndex("blog_posts_slug_en_uidx")
      .on(sql`(${table.translations}->'en'->>'slug')`)
      .where(sql`${table.translations}->'en'->>'slug' IS NOT NULL`),
    uniqueIndex("blog_posts_slug_ru_uidx")
      .on(sql`(${table.translations}->'ru'->>'slug')`)
      .where(sql`${table.translations}->'ru'->>'slug' IS NOT NULL`),
  ],
);
