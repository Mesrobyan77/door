import { z } from "zod";

import { BLOG_POST_STATUSES } from "@/features/blog/domain/blog-rules";
import { locales } from "@/lib/i18n/config";

const localeCopySchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().min(1).max(100_000),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(320).optional(),
});

export const upsertBlogPostSchema = z.object({
  editingLocale: z.enum(locales).default("en"),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().min(1).max(100_000),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(320).optional(),
  status: z.enum(BLOG_POST_STATUSES).default("DRAFT"),
  publishedAt: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => {
      if (!value) return null;
      return value;
    }),
  tags: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => {
      if (!value) {
        return [] as string[];
      }
      return value
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .slice(0, 20);
    }),
});

export type UpsertBlogPostFormInput = z.input<typeof upsertBlogPostSchema>;
export type UpsertBlogPostInput = z.output<typeof upsertBlogPostSchema>;

export const blogPostIdSchema = z.object({
  postId: z.string().uuid(),
});

export type BlogPostIdInput = z.infer<typeof blogPostIdSchema>;

export { localeCopySchema };
