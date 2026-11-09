import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateHdoorsCatalog } from '@/db/import/hdoors-catalog-schema';

const datasetPath = path.resolve(process.cwd(), 'data/imports/hdoors-initial-catalog/catalog.json');

describe('Hdoors initial catalog dataset', () => {
  it('contains a valid, source-backed, non-purchasable 30-model batch', async () => {
    const dataset = validateHdoorsCatalog(JSON.parse(await readFile(datasetPath, 'utf8')));

    expect(dataset.products).toHaveLength(30);
    expect(dataset.categories).toHaveLength(10);
    expect(dataset.products.filter((item) => item.classification === 'INTERIOR')).toHaveLength(20);
    expect(dataset.products.filter((item) => item.classification === 'ENTRANCE')).toHaveLength(10);
    expect(dataset.products.every((item) => item.variant.status === 'INQUIRY')).toBe(true);
    expect(dataset.products.every((item) => item.source.reusePermission === 'UNKNOWN')).toBe(true);
    expect(dataset.products.find((item) => item.recordKey.includes('linen'))).toBeDefined();
  });
});
