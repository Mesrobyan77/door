/** Shared Next.js cache tags for public storefront read models. */
export const CACHE_TAGS = {
  products: "products",
  /** All PDP caches — invalidate on price-wide changes (promotions, categories). */
  productDetail: "product-detail",
  product: (id: string) => `product:${id}`,
  productSlug: (locale: string, slug: string) =>
    `product-slug:${locale}:${slug}`,
  hero: "hero",
  blog: "blog",
  blogPost: (id: string) => `blog:${id}`,
  blogPostSlug: (locale: string, slug: string) =>
    `blog-slug:${locale}:${slug}`,
  settings: "settings",
} as const;

/** Default revalidation window for public catalog/content caches (seconds). */
export const PUBLIC_CACHE_REVALIDATE_SECONDS = 60;
