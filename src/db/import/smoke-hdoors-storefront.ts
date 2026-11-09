import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { validateHdoorsCatalog } from '@/db/import/hdoors-catalog-schema';

const draftRecordKey = 'belwooddoors-event-1-graphite-900';

async function main(): Promise<void> {
  const baseUrl = process.argv.find((argument) => argument.startsWith('--base-url='))?.slice(11);
  if (!baseUrl) throw new Error('Pass --base-url=http://localhost:3000 explicitly.');

  const catalog = validateHdoorsCatalog(
    JSON.parse(
      await readFile(
        path.resolve(process.cwd(), 'data/imports/hdoors-initial-catalog/catalog.json'),
        'utf8',
      ),
    ),
  );

  const categorySlugs = new Map(
    catalog.categories.flatMap((category) =>
      (['hy', 'en', 'ru'] as const).map((locale) => [
        `${locale}:${category.key}`,
        category.translations[locale].slug,
      ]),
    ),
  );

  async function getHtml(relativeUrl: string, expectedStatus = 200): Promise<string> {
    const response = await fetch(new URL(relativeUrl, baseUrl), { redirect: 'manual' });
    if (response.status !== expectedStatus) {
      throw new Error(`${relativeUrl}: expected ${expectedStatus}, got ${response.status}.`);
    }
    return response.text();
  }

  for (const locale of ['hy', 'en', 'ru'] as const) {
    const listing = await getHtml(`/${locale}/products?pageSize=48`);
    if (listing.includes('data-catalog-demo-notice')) {
      throw new Error(`${locale}: removed demo banner is still rendered.`);
    }
    for (const product of catalog.products) {
      const href = `/${locale}/products/${product.translations[locale].slug}`;
      const visible = listing.includes(href);
      if (product.recordKey === draftRecordKey ? visible : !visible) {
        throw new Error(`${locale}: unexpected catalog visibility for ${product.recordKey}.`);
      }
    }
    if (!listing.includes('grid-cols-2') || !listing.includes('xl:grid-cols-4')) {
      throw new Error(`${locale}: responsive catalog grid classes are missing.`);
    }

    for (const categoryKey of catalog.categories.map((category) => category.key)) {
      const categorySlug = categorySlugs.get(`${locale}:${categoryKey}`);
      if (!categorySlug) throw new Error(`${locale}: missing ${categoryKey} category slug.`);
      const filtered = await getHtml(
        `/${locale}/products?pageSize=48&category=${encodeURIComponent(categorySlug)}`,
      );
      for (const product of catalog.products.filter((item) => item.recordKey !== draftRecordKey)) {
        const href = `/${locale}/products/${product.translations[locale].slug}`;
        const shouldBeVisible = product.categoryKeys.includes(categoryKey);
        if (filtered.includes(href) !== shouldBeVisible) {
          throw new Error(`${locale}: ${categoryKey} filter mismatch for ${product.recordKey}.`);
        }
      }
    }

    const sample = catalog.products[0];
    if (!sample) throw new Error('Catalog has no sample product.');
    const detail = await getHtml(`/${locale}/products/${sample.translations[locale].slug}`);
    if (!detail.includes('res.cloudinary.com')) {
      throw new Error(`${locale}: sample product does not render Cloudinary media.`);
    }
    const cloudinaryOccurrences = detail.split('res.cloudinary.com').length - 1;
    if (cloudinaryOccurrences < 3) {
      throw new Error(`${locale}: sample product does not render all three images.`);
    }
    const localizedIllustrativePrefix = {
      hy: 'Պատկերազարդ լուսանկար',
      en: 'Illustrative photo',
      ru: 'Иллюстративная фотография',
    }[locale];
    if (!detail.includes(localizedIllustrativePrefix)) {
      throw new Error(`${locale}: localized illustrative alt text is missing.`);
    }

    const draft = catalog.products.find((product) => product.recordKey === draftRecordKey);
    if (!draft) throw new Error('Draft product is missing from the source catalog.');
    const draftUrl = `/${locale}/products/${draft.translations[locale].slug}`;
    const draftResponse = await fetch(new URL(draftUrl, baseUrl), { redirect: 'manual' });
    const draftHtml = await draftResponse.text();
    if (![200, 404].includes(draftResponse.status)) {
      throw new Error(`${draftUrl}: expected a hard or streamed soft 404.`);
    }
    if (draftHtml.includes(draft.translations[locale].title)) {
      throw new Error(`${locale}: draft product content is directly accessible.`);
    }
    if (
      draftResponse.status === 200 &&
      (!draftHtml.includes('noindex') || !draftHtml.includes('NEXT_HTTP_ERROR_FALLBACK;404'))
    ) {
      throw new Error(`${locale}: draft product did not render the Next.js soft-404 boundary.`);
    }
  }

  console.log(
    JSON.stringify({
      baseUrl,
      locales: ['hy', 'en', 'ru'],
      publishedProductsChecked: 29,
      retainedDraftHidden: true,
      categoryFiltersChecked: true,
      cloudinaryAndLocalizedAltChecked: true,
      responsiveCatalogMarkupChecked: true,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
