import { describe, expect, it } from "vitest";

import {
  canArchiveBlogPost,
  canPublishBlogPost,
  isBlogPostStatus,
  normalizeBlogSlug,
  resolveBlogTranslation,
  validateBlogLocaleCopy,
} from "@/features/blog/domain/blog-rules";

describe("blog rules", () => {
  it("normalizes slugs", () => {
    expect(normalizeBlogSlug("  Hello World!  ")).toBe("hello-world");
    expect(normalizeBlogSlug("Already-good")).toBe("already-good");
  });

  it("validates locale copy", () => {
    expect(
      validateBlogLocaleCopy({
        title: "Post",
        slug: "post-one",
        content: "<p>Body</p>",
      }),
    ).toBeNull();

    expect(
      validateBlogLocaleCopy({
        title: "",
        slug: "post",
        content: "x",
      }),
    ).toBe("TITLE_REQUIRED");
  });

  it("exposes status helpers", () => {
    expect(isBlogPostStatus("DRAFT")).toBe(true);
    expect(isBlogPostStatus("OPEN")).toBe(false);
    expect(canPublishBlogPost("DRAFT")).toBe(true);
    expect(canPublishBlogPost("PUBLISHED")).toBe(false);
    expect(canArchiveBlogPost("PUBLISHED")).toBe(true);
  });

  it("resolves locale with fallbacks", () => {
    expect(
      resolveBlogTranslation(
        {
          en: { title: "EN", slug: "en", content: "x" },
        },
        "ru",
      ),
    ).toEqual({ title: "EN", slug: "en", content: "x" });
  });
});
