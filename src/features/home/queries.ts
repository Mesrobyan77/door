import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { categories, mediaAssets, productCategories, products } from '@/db/schema';
import type { Locale } from '@/lib/i18n/config';

/** Three existing, populated collections. Glazing remains a category facet. */
export async function getHomeCollections(locale: Locale) {
  const rows = await getDb()
    .select({
      categoryId: categories.id,
      translations: categories.translations,
      imageUrl: mediaAssets.secureUrl,
      source: mediaAssets.sourceMetadata,
    })
    .from(categories)
    .innerJoin(productCategories, eq(productCategories.categoryId, categories.id))
    .innerJoin(products, eq(products.id, productCategories.productId))
    .innerJoin(mediaAssets, eq(mediaAssets.productId, products.id))
    .where(
      and(
        eq(categories.status, 'ACTIVE'),
        isNull(categories.deletedAt),
        eq(products.status, 'ACTIVE'),
        isNull(products.deletedAt),
        eq(mediaAssets.isPrimary, true),
        eq(mediaAssets.uploadStatus, 'READY'),
      ),
    )
    .orderBy(asc(categories.sortOrder), asc(products.createdAt));
  const unique = [...new Map(rows.map((row) => [row.categoryId, row])).values()];
  const preferred = ['interior-doors', 'entrance-doors', 'glazed-doors'];
  const selected = preferred.flatMap((slug) =>
    unique.filter((row) => row.translations.en?.slug === slug),
  );
  for (const row of unique)
    if (selected.length < 3 && !selected.some((item) => item.categoryId === row.categoryId))
      selected.push(row);
  return selected.flatMap((row) => {
    const translation = row.translations[locale] ?? row.translations.hy;
    return translation
      ? [
          {
            title: translation.title,
            href: `/${locale}/products?category=${translation.slug}`,
            imageUrl: row.imageUrl,
            illustrative: row.source?.kind === 'ILLUSTRATIVE_PEXELS',
          },
        ]
      : [];
  });
}
