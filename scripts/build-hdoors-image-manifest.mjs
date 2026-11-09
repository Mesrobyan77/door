import { readFile, writeFile } from 'node:fs/promises';

const catalogPath = new URL('../data/imports/hdoors-initial-catalog/catalog.json', import.meta.url);
const manifestPath = new URL(
  '../data/imports/hdoors-initial-catalog/image-sources.json',
  import.meta.url,
);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const existing = JSON.parse(await readFile(manifestPath, 'utf8'));
const pool = [
  ...new Map(existing.images.map((image) => [image.pexelsPhotoId, image])).values(),
].map((source) => {
  const image = { ...source };
  delete image.slot;
  delete image.recordKey;
  return image;
});
if (pool.length < 10) throw new Error('At least ten verified Pexels source records are required.');
const draft = 'belwooddoors-event-1-graphite-900';
const products = catalog.products.filter((product) => product.recordKey !== draft);
const images = products.flatMap((product, productIndex) =>
  [0, 1, 2].map((slot) => ({
    recordKey: product.recordKey,
    slot,
    ...pool[(productIndex * 3 + slot) % pool.length],
  })),
);
await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      version: 2,
      retrievedAt: '2026-11-09',
      permissionBasis:
        'Pexels License (https://www.pexels.com/license/) and Pexels API attribution requirements (https://www.pexels.com/api/documentation/)',
      usageDisclosure:
        'Every entry is illustrative photography and is not claimed to depict the exact purchasable model.',
      exactModelResearchResult:
        'No exact-model image was imported because explicit reuse permission could not be confirmed on the reviewed individual product pages.',
      images,
    },
    null,
    2,
  )}\n`,
  'utf8',
);
