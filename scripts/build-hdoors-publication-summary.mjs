import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../data/imports/hdoors-initial-catalog/', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('catalog.json', root), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('image-sources.json', root), 'utf8'));
const draft = 'belwooddoors-event-1-graphite-900';
const imageCounts = new Map();
for (const image of manifest.images)
  imageCounts.set(image.recordKey, (imageCounts.get(image.recordKey) ?? 0) + 1);
const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const rows = [
  'record_key,product_status,variant_status,price_amd,demo_stock,exact_images,pexels_images,matching_photography_missing,source_url',
];
for (const product of catalog.products) {
  const isDraft = product.recordKey === draft;
  const price = isDraft ? null : (product.source.observedPrice?.amount ?? null);
  rows.push(
    [
      product.recordKey,
      isDraft ? 'DRAFT' : 'ACTIVE',
      price ? 'ACTIVE' : 'INQUIRY',
      price ?? '',
      price ? 3 : 0,
      0,
      imageCounts.get(product.recordKey) ?? 0,
      isDraft ? 'N/A_DRAFT' : 'YES',
      product.source.url,
    ]
      .map(quote)
      .join(','),
  );
}
await writeFile(
  new URL('development-publication-summary.csv', root),
  `${rows.join('\n')}\n`,
  'utf8',
);
