import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { config as loadEnv } from 'dotenv';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWebSocket } from 'drizzle-orm/neon-serverless';
import { v7 as uuidv7 } from 'uuid';
import ws from 'ws';

import { validateHdoorsCatalog } from '@/db/import/hdoors-catalog-schema';
import * as schema from '@/db/schema';

const datasetPath = path.resolve(process.cwd(), 'data/imports/hdoors-initial-catalog/catalog.json');

type ImportPlan = {
  categoriesToCreate: number;
  productsToCreate: number;
  existingCategories: number;
  existingProducts: number;
  conflicts: string[];
};

function loadEnvironment(): void {
  loadEnv({ path: path.resolve(process.cwd(), '.env') });
  loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true });
}

function getArgs(): { apply: boolean; target: 'development' | 'test' } {
  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply');
  const targetArg = [...args].find((arg) => arg.startsWith('--target='));
  const target = targetArg?.slice('--target='.length);
  if (target !== 'development' && target !== 'test') {
    throw new Error('Pass --target=development or --target=test explicitly.');
  }
  return { apply, target };
}

function assertSafeTarget(databaseUrl: string, target: 'development' | 'test'): URL {
  const parsed = new URL(databaseUrl);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing catalog import while NODE_ENV=production.');
  }
  const declaredEnvironment = process.env.DATABASE_ENVIRONMENT?.toLowerCase();
  if (declaredEnvironment === 'production') {
    throw new Error('Refusing catalog import when DATABASE_ENVIRONMENT=production.');
  }
  if (declaredEnvironment && declaredEnvironment !== target) {
    throw new Error(
      `DATABASE_ENVIRONMENT=${declaredEnvironment} does not match --target=${target}.`,
    );
  }
  if (target === 'development' && !parsed.hostname.startsWith('ep-ancient-poetry-bdwveofc')) {
    throw new Error(`Refusing unexpected development host ${parsed.hostname}.`);
  }
  if (parsed.hostname.startsWith('ep-rapid-breeze-bdsqy769')) {
    throw new Error('Refusing production endpoint.');
  }
  return parsed;
}

function collectSlugs(translations: schema.TranslationsJson): string[] {
  return [translations.hy?.slug, translations.en?.slug, translations.ru?.slug].filter(
    (slug): slug is string => Boolean(slug),
  );
}

function findByAnySlug<T extends { translations: schema.TranslationsJson }>(
  rows: T[],
  translations: schema.TranslationsJson,
): T | undefined {
  const expected = new Set(collectSlugs(translations));
  return rows.find((row) => collectSlugs(row.translations).some((slug) => expected.has(slug)));
}

async function main(): Promise<void> {
  loadEnvironment();
  const args = getArgs();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  const targetUrl = assertSafeTarget(databaseUrl, args.target);
  const dataset = validateHdoorsCatalog(JSON.parse(await readFile(datasetPath, 'utf8')));

  const db = drizzleHttp(neon(databaseUrl), { schema });
  const [existingCategories, existingProducts, existingVariants] = await Promise.all([
    db
      .select({ id: schema.categories.id, translations: schema.categories.translations })
      .from(schema.categories),
    db
      .select({
        id: schema.products.id,
        sku: schema.products.sku,
        translations: schema.products.translations,
      })
      .from(schema.products),
    db
      .select({
        id: schema.productVariants.id,
        productId: schema.productVariants.productId,
        sku: schema.productVariants.sku,
      })
      .from(schema.productVariants),
  ]);

  const plan: ImportPlan = {
    categoriesToCreate: 0,
    productsToCreate: 0,
    existingCategories: 0,
    existingProducts: 0,
    conflicts: [],
  };

  for (const category of dataset.categories) {
    const existing = findByAnySlug(existingCategories, category.translations);
    if (!existing) {
      plan.categoriesToCreate += 1;
      continue;
    }
    const expectedSlugs = collectSlugs(category.translations).sort().join('|');
    const actualSlugs = collectSlugs(existing.translations).sort().join('|');
    if (expectedSlugs !== actualSlugs) {
      plan.conflicts.push(`Category slug collision for ${category.key}: ${actualSlugs}`);
    } else {
      plan.existingCategories += 1;
    }
  }

  for (const product of dataset.products) {
    const bySku = existingProducts.find((row) => row.sku === product.sku);
    const bySlug = findByAnySlug(existingProducts, product.translations);
    const existingVariant = existingVariants.find((row) => row.sku === product.variant.sku);
    if (!bySku && !bySlug && !existingVariant) {
      plan.productsToCreate += 1;
      continue;
    }
    if (!bySku || (bySlug && bySlug.id !== bySku.id)) {
      plan.conflicts.push(`Product identity collision for ${product.recordKey}.`);
      continue;
    }
    if (!existingVariant || existingVariant.productId !== bySku.id) {
      plan.conflicts.push(`Variant identity collision or partial import for ${product.recordKey}.`);
      continue;
    }
    plan.existingProducts += 1;
  }

  const mode = args.apply ? 'APPLY' : 'DRY RUN';
  console.log(`[${mode}] Hdoors catalog -> ${targetUrl.hostname}/${targetUrl.pathname.slice(1)}`);
  console.log(JSON.stringify(plan, null, 2));
  if (plan.conflicts.length > 0) {
    throw new Error('Import conflicts detected; no changes were applied.');
  }
  if (!args.apply) return;

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: databaseUrl });
  const transactionDb = drizzleWebSocket({ client: pool, schema });
  try {
    await transactionDb.transaction(async (tx) => {
      const categoryIds = new Map<string, string>();
      const transactionCategories = await tx
        .select({ id: schema.categories.id, translations: schema.categories.translations })
        .from(schema.categories);

      for (const category of dataset.categories) {
        const existing = findByAnySlug(transactionCategories, category.translations);
        if (existing) {
          categoryIds.set(category.key, existing.id);
          continue;
        }
        const id = uuidv7();
        await tx.insert(schema.categories).values({
          id,
          translations: category.translations,
          sortOrder: category.sortOrder,
          status: 'ACTIVE',
        });
        categoryIds.set(category.key, id);
        transactionCategories.push({ id, translations: category.translations });
      }

      const transactionProducts = await tx
        .select({ id: schema.products.id, sku: schema.products.sku })
        .from(schema.products);

      for (const product of dataset.products) {
        if (transactionProducts.some((row) => row.sku === product.sku)) continue;
        const categoryId = categoryIds.get(product.categoryKey);
        if (!categoryId) throw new Error(`Missing category for ${product.recordKey}.`);

        const productId = uuidv7();
        const variantId = uuidv7();
        await tx.insert(schema.products).values({
          id: productId,
          sku: product.sku,
          translations: product.translations,
          priceAmount: 0,
          compareAtAmount: null,
          stockOnHand: 0,
          lowStockThreshold: 0,
          status: 'DRAFT',
          isFeatured: false,
          isUpcoming: false,
          brandName: product.brand,
          modelName: product.model,
          collectionName: product.collection,
          doorClassification: product.classification,
          entranceEnvironments: product.entranceEnvironments,
          structuralMaterial: product.structuralMaterial,
          coreMaterial: product.coreMaterial,
          surfaceCoating: product.surfaceCoating,
          hasGlazing: product.hasGlazing,
          glazingType: product.glazingType,
          manufacturer: product.manufacturer,
          countryOfManufacture: product.countryOfManufacture,
          openingMechanism: null,
          frameSystem: null,
          leafConfiguration: null,
        });
        await tx.insert(schema.productVariants).values({
          id: variantId,
          productId,
          sku: product.variant.sku,
          configurationKey: product.variant.configurationKey,
          itemType: product.variant.itemType,
          status: 'INQUIRY',
          priceAmount: null,
          compareAtAmount: null,
          stockOnHand: 0,
          lowStockThreshold: 0,
          leafWidthMm: product.variant.leafWidthMm,
          leafHeightMm: product.variant.leafHeightMm,
          leafThicknessMm: product.variant.leafThicknessMm,
          unitWidthMm: product.variant.unitWidthMm,
          unitHeightMm: product.variant.unitHeightMm,
          frameDepthMm: product.variant.frameDepthMm,
          colorName: product.variant.colorName,
          finishName: product.variant.finishName,
          handing: product.variant.handing,
          swing: product.variant.swing,
          includedComponents: product.variant.includedComponents,
        });
        await tx.insert(schema.productCategories).values(
          product.categoryKeys.map((key, index) => {
            const linkedCategoryId = categoryIds.get(key);
            if (!linkedCategoryId)
              throw new Error(`Missing category ${key} for ${product.recordKey}.`);
            return {
              id: uuidv7(),
              productId,
              categoryId: linkedCategoryId,
              isPrimary: index === 0,
              sortOrder: index,
            };
          }),
        );
        transactionProducts.push({ id: productId, sku: product.sku });
      }
    });
  } finally {
    await pool.end();
  }

  console.log(
    `[APPLY COMPLETE] created ${plan.categoriesToCreate} categories and ${plan.productsToCreate} draft products/variants.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
