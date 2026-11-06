'use server';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getDb } from '@/db/client';
import {
  categories,
  productCategories,
  products,
  productVariants,
  stockMovements,
  type IncludedComponent,
  type TranslationsJson,
} from '@/db/schema';
import {
  persistProductMedia,
  persistProductVariantMedia,
} from '@/features/products/application/persist-product-media';
import { requireAdmin } from '@/lib/auth/policies';
import { invalidateProductsCache } from '@/lib/cache/invalidate-public';
import { createId } from '@/lib/id';
import { isLocale, locales, type Locale } from '@/lib/i18n/config';
import { err, ok, type Result } from '@/lib/result';
import { withTransaction } from '@/db/transaction';
import { configurationIdentity } from '@/features/products/domain/door-variant';

const nullableText = z.string().trim().max(200).nullable();

const includedComponentSchema = z.object({
  code: z.enum([
    'FRAME',
    'ARCHITRAVE',
    'HINGE',
    'HANDLE',
    'LOCK',
    'CYLINDER',
    'THRESHOLD',
    'FRAME_EXTENSION',
  ]),
  status: z.enum(['INCLUDED', 'EXCLUDED', 'UNKNOWN']),
  quantity: z.number().int().positive().optional(),
});

const variantInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    sku: z.string().trim().min(1).max(120),
    itemType: z.enum(['LEGACY', 'LEAF_ONLY', 'FRAMED_UNIT', 'FIXED_PACKAGE']),
    status: z.enum(['ACTIVE', 'INQUIRY', 'ARCHIVED']),
    priceAmount: z.number().int().nonnegative().nullable(),
    compareAtAmount: z.number().int().nonnegative().nullable(),
    stockOnHand: z.number().int().nonnegative(),
    lowStockThreshold: z.number().int().nonnegative(),
    leafWidthMm: z.number().int().positive().nullable(),
    leafHeightMm: z.number().int().positive().nullable(),
    leafThicknessMm: z.number().int().positive().nullable(),
    secondaryLeafWidthMm: z.number().int().positive().nullable(),
    unitWidthMm: z.number().int().positive().nullable(),
    unitHeightMm: z.number().int().positive().nullable(),
    frameDepthMm: z.number().int().positive().nullable(),
    roughOpeningWidthMm: z.number().int().positive().nullable(),
    roughOpeningHeightMm: z.number().int().positive().nullable(),
    colorName: nullableText,
    finishName: nullableText,
    exteriorColorName: nullableText,
    exteriorFinishName: nullableText,
    handing: z.enum(['LEFT', 'RIGHT', 'REVERSIBLE', 'NOT_APPLICABLE']).nullable(),
    swing: z.enum(['INWARD', 'OUTWARD', 'NOT_APPLICABLE']).nullable(),
    includedComponents: z.array(includedComponentSchema).nullable(),
    mediaAssetIds: z.array(z.string().uuid()).max(12).default([]),
    orderedImageIds: z.array(z.string().uuid()).max(12).default([]),
    primaryNewIndex: z.number().int().nullable().default(null),
    primaryExistingId: z.string().uuid().nullable().default(null),
    removeImageIds: z.array(z.string().uuid()).max(12).default([]),
  })
  .superRefine((variant, context) => {
    if (variant.itemType === 'LEAF_ONLY' && (!variant.leafWidthMm || !variant.leafHeightMm)) {
      context.addIssue({
        code: 'custom',
        path: ['leafWidthMm'],
        message: 'Leaf-only configurations require leaf width and height in mm.',
      });
    }
    if (
      (variant.itemType === 'FRAMED_UNIT' || variant.itemType === 'FIXED_PACKAGE') &&
      (!variant.unitWidthMm || !variant.unitHeightMm)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['unitWidthMm'],
        message: 'Framed configurations require overall unit width and height in mm.',
      });
    }
    if (variant.status !== 'INQUIRY' && variant.priceAmount == null) {
      context.addIssue({
        code: 'custom',
        path: ['priceAmount'],
        message: 'A sellable variant requires a confirmed price.',
      });
    }
    if (
      variant.compareAtAmount != null &&
      variant.priceAmount != null &&
      variant.compareAtAmount < variant.priceAmount
    ) {
      context.addIssue({
        code: 'custom',
        path: ['compareAtAmount'],
        message: 'Compare-at price must be greater than or equal to price.',
      });
    }
  });

const productUpsertSchema = z.object({
  sku: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  priceAmount: z.number().int().nonnegative().optional(),
  compareAtAmount: z.number().int().nonnegative().nullable().optional(),
  stockOnHand: z.number().int().nonnegative().optional(),
  doorClassification: z.enum(['INTERIOR', 'ENTRANCE']).nullable().optional(),
  entranceEnvironments: z
    .array(z.enum(['APARTMENT', 'OUTDOOR_HOUSE']))
    .nullable()
    .optional(),
  brandName: nullableText.optional(),
  modelName: nullableText.optional(),
  collectionName: nullableText.optional(),
  structuralMaterial: nullableText.optional(),
  coreMaterial: nullableText.optional(),
  surfaceCoating: nullableText.optional(),
  hasGlazing: z.boolean().nullable().optional(),
  glazingType: nullableText.optional(),
  manufacturer: nullableText.optional(),
  countryOfManufacture: nullableText.optional(),
  openingMechanism: z.enum(['HINGED', 'SLIDING', 'FOLDING']).nullable().optional(),
  frameSystem: z.enum(['STANDARD', 'CONCEALED']).nullable().optional(),
  leafConfiguration: z.enum(['SINGLE', 'DOUBLE', 'UNEQUAL_DOUBLE']).nullable().optional(),
  performanceSpecifications: z
    .object({
      thermalBreak: z.boolean().nullable().optional(),
      thermalTransmittance: z
        .object({ value: z.number().finite().positive(), unit: z.string().trim().min(1).max(20) })
        .nullable()
        .optional(),
      soundReduction: z
        .object({ value: z.number().finite().positive(), unit: z.string().trim().min(1).max(20) })
        .nullable()
        .optional(),
      fireClassification: z
        .object({
          value: z.string().trim().min(1).max(60),
          standard: z.string().trim().max(100).optional(),
        })
        .nullable()
        .optional(),
      securityClassification: z
        .object({
          value: z.string().trim().min(1).max(60),
          standard: z.string().trim().max(100).optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  variants: z.array(variantInputSchema).min(1).max(100).optional(),
  categoryIds: z.array(z.string().uuid()),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  primaryExistingId: z.string().uuid().nullable(),
  primaryNewIndex: z.number().int().nullable(),
  removeImageIds: z.array(z.string().uuid()),
  mediaAssetIds: z.array(z.string().uuid()).max(12),
});

export type ProductUpsertInput = z.infer<typeof productUpsertSchema>;

type VariantInput = z.infer<typeof variantInputSchema>;

function buildTranslations(data: ProductUpsertInput): TranslationsJson {
  const entry = {
    title: data.title,
    slug: data.slug,
    description: data.description || undefined,
  };
  return { hy: entry, en: entry, ru: entry };
}

function getVariantInputs(data: ProductUpsertInput): VariantInput[] | null {
  if (data.variants) return data.variants;
  if (data.sku == null || data.priceAmount == null || data.stockOnHand == null) {
    return null;
  }
  return [
    {
      sku: data.sku,
      itemType: 'LEGACY',
      status: data.status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
      priceAmount: data.priceAmount,
      compareAtAmount: data.compareAtAmount ?? null,
      stockOnHand: data.stockOnHand,
      lowStockThreshold: 5,
      leafWidthMm: null,
      leafHeightMm: null,
      leafThicknessMm: null,
      secondaryLeafWidthMm: null,
      unitWidthMm: null,
      unitHeightMm: null,
      frameDepthMm: null,
      roughOpeningWidthMm: null,
      roughOpeningHeightMm: null,
      colorName: null,
      finishName: null,
      exteriorColorName: null,
      exteriorFinishName: null,
      handing: null,
      swing: null,
      includedComponents: null,
      mediaAssetIds: [],
      orderedImageIds: [],
      primaryNewIndex: null,
      primaryExistingId: null,
      removeImageIds: [],
    },
  ];
}

function getConfigurationKeys(variants: VariantInput[]): string[] | null {
  const keys = variants.map((variant) => configurationIdentity(variant));
  return new Set(keys).size === keys.length ? keys : null;
}

async function persistProductVariants(
  productId: string,
  variants: VariantInput[],
  actorUserId: string,
  productUpdate: Partial<typeof products.$inferInsert>,
): Promise<{ error: string | null; variantIds: string[] }> {
  const skuSet = new Set(variants.map((variant) => variant.sku.trim()));
  const configurationKeys = getConfigurationKeys(variants);
  if (skuSet.size !== variants.length || !configurationKeys) {
    return {
      error: 'Variants must have unique SKUs and configurations within this product.',
      variantIds: [],
    };
  }

  const variantIds: string[] = [];
  const error = await withTransaction(async (tx) => {
    const [lockedProduct] = await tx
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), isNull(products.deletedAt)))
      .for('update')
      .limit(1);
    if (!lockedProduct) return 'Product not found.';

    const existing = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .for('update');
    const existingById = new Map(existing.map((variant) => [variant.id, variant]));
    const submittedIds = variants.flatMap((variant) => (variant.id ? [variant.id] : []));
    if (
      new Set(submittedIds).size !== submittedIds.length ||
      submittedIds.some((id) => !existingById.has(id))
    ) {
      return 'One or more variants do not belong to this product.';
    }

    const existingSkus = await tx
      .select({ id: productVariants.id, sku: productVariants.sku })
      .from(productVariants)
      .where(inArray(productVariants.sku, [...skuSet]));
    if (existingSkus.some((row) => !existingById.has(row.id) || !submittedIds.includes(row.id))) {
      return 'A SKU is already assigned to another variant.';
    }

    const retainedIds = new Set(submittedIds);
    for (let index = 0; index < variants.length; index += 1) {
      const input = variants[index];
      const configurationKey = configurationKeys[index];
      if (!input || !configurationKey) continue;

      const values = {
        productId,
        sku: input.sku.trim(),
        configurationKey,
        itemType: input.itemType,
        status: input.status,
        priceAmount: input.priceAmount,
        compareAtAmount: input.compareAtAmount,
        stockOnHand: input.stockOnHand,
        lowStockThreshold: input.lowStockThreshold,
        leafWidthMm: input.leafWidthMm,
        leafHeightMm: input.leafHeightMm,
        leafThicknessMm: input.leafThicknessMm,
        secondaryLeafWidthMm: input.secondaryLeafWidthMm,
        unitWidthMm: input.unitWidthMm,
        unitHeightMm: input.unitHeightMm,
        frameDepthMm: input.frameDepthMm,
        roughOpeningWidthMm: input.roughOpeningWidthMm,
        roughOpeningHeightMm: input.roughOpeningHeightMm,
        colorName: input.colorName,
        finishName: input.finishName,
        exteriorColorName: input.exteriorColorName,
        exteriorFinishName: input.exteriorFinishName,
        handing: input.handing,
        swing: input.swing,
        includedComponents: input.includedComponents as IncludedComponent[] | null,
        updatedAt: new Date(),
      };

      if (input.id) {
        variantIds[index] = input.id;
        const oldVariant = existingById.get(input.id);
        if (!oldVariant) return 'Variant not found.';
        await tx.update(productVariants).set(values).where(eq(productVariants.id, input.id));

        const delta = input.stockOnHand - oldVariant.stockOnHand;
        if (delta !== 0) {
          await tx.insert(stockMovements).values({
            id: createId(),
            productId,
            variantId: input.id,
            delta,
            reason: 'ADMIN_ADJUSTMENT',
            actorUserId,
            resultingBalance: input.stockOnHand,
          });
        }
      } else {
        const id = createId();
        variantIds[index] = id;
        await tx.insert(productVariants).values({ id, ...values });
        if (input.stockOnHand > 0) {
          await tx.insert(stockMovements).values({
            id: createId(),
            productId,
            variantId: id,
            delta: input.stockOnHand,
            reason: 'ADMIN_ADJUSTMENT',
            actorUserId,
            resultingBalance: input.stockOnHand,
          });
        }
      }
    }

    const archivedIds = existing
      .filter((variant) => !retainedIds.has(variant.id))
      .map((variant) => variant.id);
    if (archivedIds.length > 0) {
      await tx
        .update(productVariants)
        .set({ status: 'ARCHIVED', updatedAt: new Date() })
        .where(inArray(productVariants.id, archivedIds));
    }

    await tx.update(products).set(productUpdate).where(eq(products.id, productId));

    return null;
  });
  return { error, variantIds };
}

function revalidateProducts(
  locale: string,
  product: { id: string; slug: string; previousSlug?: string },
): void {
  revalidatePath(`/${locale}/admin/products`);
  revalidatePath(`/${locale}/products`);
  for (const loc of locales) {
    revalidatePath(`/${loc}`);
  }
  invalidateProductsCache({
    productId: product.id,
    slug: product.slug,
  });
  if (product.previousSlug && product.previousSlug !== product.slug) {
    invalidateProductsCache({ slug: product.previousSlug });
  }
}

function parsePayload(formData: FormData): ProductUpsertInput | null {
  const raw = formData.get('data');
  if (typeof raw !== 'string') return null;
  try {
    return productUpsertSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function syncProductCategories(
  productId: string,
  categoryIds: string[],
): Promise<string | null> {
  const uniqueIds = [...new Set(categoryIds)];
  if (uniqueIds.length > 0) {
    const found = await getDb()
      .select({ id: categories.id })
      .from(categories)
      .where(and(inArray(categories.id, uniqueIds), isNull(categories.deletedAt)));
    if (found.length !== uniqueIds.length) {
      return 'One or more categories were not found.';
    }
  }

  await getDb().delete(productCategories).where(eq(productCategories.productId, productId));

  if (uniqueIds.length === 0) return null;

  await getDb()
    .insert(productCategories)
    .values(
      uniqueIds.map((categoryId, index) => ({
        id: createId(),
        productId,
        categoryId,
        isPrimary: index === 0,
        sortOrder: index,
      })),
    );

  return null;
}

/** Creates a product from the admin drawer (fields + optional images). */
export async function createProductFromDrawerAction(
  locale: string,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err('INVALID_LOCALE', 'Invalid locale.');
  }

  const data = parsePayload(formData);
  if (!data) {
    return err('VALIDATION_ERROR', 'Invalid product payload.');
  }

  const variants = getVariantInputs(data);
  if (!variants || variants.some((variant) => variant.id)) {
    return err('VALIDATION_ERROR', 'At least one valid sellable configuration is required.');
  }
  const configurationKeys = getConfigurationKeys(variants);
  if (
    !configurationKeys ||
    new Set(variants.map((variant) => variant.sku.trim())).size !== variants.length
  ) {
    return err(
      'VALIDATION_ERROR',
      'Variants must have unique SKUs and configurations within this product.',
    );
  }

  const actor = await requireAdmin(locale as Locale);
  const id = createId();
  const createdVariantIds: string[] = [];
  await withTransaction(async (tx) => {
    const firstVariant = variants[0];
    if (!firstVariant) throw new Error('A product requires a sellable configuration.');
    await tx.insert(products).values({
      id,
      sku: firstVariant.sku.trim(),
      priceAmount: firstVariant.priceAmount ?? 0,
      compareAtAmount: firstVariant.compareAtAmount,
      stockOnHand: firstVariant.stockOnHand,
      status: data.status,
      translations: buildTranslations(data),
      doorClassification: data.doorClassification ?? null,
      entranceEnvironments: data.entranceEnvironments ?? null,
      brandName: data.brandName ?? null,
      modelName: data.modelName ?? null,
      collectionName: data.collectionName ?? null,
      structuralMaterial: data.structuralMaterial ?? null,
      coreMaterial: data.coreMaterial ?? null,
      surfaceCoating: data.surfaceCoating ?? null,
      hasGlazing: data.hasGlazing ?? null,
      glazingType: data.glazingType ?? null,
      manufacturer: data.manufacturer ?? null,
      countryOfManufacture: data.countryOfManufacture ?? null,
      openingMechanism: data.openingMechanism ?? null,
      frameSystem: data.frameSystem ?? null,
      leafConfiguration: data.leafConfiguration ?? null,
      performanceSpecifications: data.performanceSpecifications ?? null,
    });

    for (let index = 0; index < variants.length; index += 1) {
      const variant = variants[index];
      const configurationKey = configurationKeys[index];
      if (!variant || !configurationKey) continue;
      const variantId = createId();
      createdVariantIds.push(variantId);
      await tx.insert(productVariants).values({
        id: variantId,
        productId: id,
        sku: variant.sku.trim(),
        configurationKey,
        itemType: variant.itemType,
        status: variant.status,
        priceAmount: variant.priceAmount,
        compareAtAmount: variant.compareAtAmount,
        stockOnHand: variant.stockOnHand,
        lowStockThreshold: variant.lowStockThreshold,
        leafWidthMm: variant.leafWidthMm,
        leafHeightMm: variant.leafHeightMm,
        leafThicknessMm: variant.leafThicknessMm,
        secondaryLeafWidthMm: variant.secondaryLeafWidthMm,
        unitWidthMm: variant.unitWidthMm,
        unitHeightMm: variant.unitHeightMm,
        frameDepthMm: variant.frameDepthMm,
        roughOpeningWidthMm: variant.roughOpeningWidthMm,
        roughOpeningHeightMm: variant.roughOpeningHeightMm,
        colorName: variant.colorName,
        finishName: variant.finishName,
        exteriorColorName: variant.exteriorColorName,
        exteriorFinishName: variant.exteriorFinishName,
        handing: variant.handing,
        swing: variant.swing,
        includedComponents: variant.includedComponents as IncludedComponent[] | null,
      });

      if (variant.stockOnHand > 0) {
        await tx.insert(stockMovements).values({
          id: createId(),
          productId: id,
          variantId,
          delta: variant.stockOnHand,
          reason: 'ADMIN_ADJUSTMENT',
          actorUserId: actor.id,
          resultingBalance: variant.stockOnHand,
        });
      }
    }
  });

  const categoryError = await syncProductCategories(id, data.categoryIds);
  if (categoryError) {
    return err('VALIDATION_ERROR', categoryError);
  }

  const mediaResult = await persistProductMedia({
    productId: id,
    mediaAssetIds: data.mediaAssetIds,
    primaryNewIndex: data.primaryNewIndex ?? (data.mediaAssetIds.length > 0 ? 0 : null),
    primaryExistingId: null,
    removeImageIds: [],
  });
  if (mediaResult.error) {
    return err('VALIDATION_ERROR', mediaResult.error);
  }

  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    const variantId = createdVariantIds[index];
    if (!variant || !variantId) continue;
    if (
      variant.mediaAssetIds.length === 0 &&
      variant.orderedImageIds.length === 0 &&
      variant.removeImageIds.length === 0
    ) {
      continue;
    }
    const variantMediaResult = await persistProductVariantMedia({
      productId: id,
      variantId,
      mediaAssetIds: variant.mediaAssetIds,
      orderedImageIds: variant.orderedImageIds,
      primaryNewIndex: variant.primaryNewIndex,
      primaryExistingId: variant.primaryExistingId,
      removeImageIds: variant.removeImageIds,
    });
    if (variantMediaResult.error) {
      return err('VALIDATION_ERROR', variantMediaResult.error);
    }
  }

  revalidateProducts(locale, { id, slug: data.slug });
  return ok({ id });
}

/** Updates a product from the admin drawer (fields + optional images). */
export async function updateProductFromDrawerAction(
  locale: string,
  productId: string,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  if (!isLocale(locale)) {
    return err('INVALID_LOCALE', 'Invalid locale.');
  }

  const data = parsePayload(formData);
  if (!data) {
    return err('VALIDATION_ERROR', 'Invalid product payload.');
  }

  const variants = getVariantInputs(data);
  if (!variants || !getConfigurationKeys(variants)) {
    return err(
      'VALIDATION_ERROR',
      'Variants must have unique SKUs and configurations within this product.',
    );
  }

  const actor = await requireAdmin(locale as Locale);
  const [existing] = await getDb()
    .select({
      id: products.id,
      status: products.status,
      translations: products.translations,
      doorClassification: products.doorClassification,
    })
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .limit(1);

  if (!existing) {
    return err('NOT_FOUND', 'Product not found.');
  }

  const variantResult = await persistProductVariants(existing.id, variants, actor.id, {
    status: data.status,
    translations: buildTranslations(data),
    doorClassification:
      data.doorClassification === undefined ? existing.doorClassification : data.doorClassification,
    entranceEnvironments: data.entranceEnvironments,
    brandName: data.brandName,
    modelName: data.modelName,
    collectionName: data.collectionName,
    structuralMaterial: data.structuralMaterial,
    coreMaterial: data.coreMaterial,
    surfaceCoating: data.surfaceCoating,
    hasGlazing: data.hasGlazing,
    glazingType: data.glazingType,
    manufacturer: data.manufacturer,
    countryOfManufacture: data.countryOfManufacture,
    openingMechanism: data.openingMechanism,
    frameSystem: data.frameSystem,
    leafConfiguration: data.leafConfiguration,
    performanceSpecifications: data.performanceSpecifications,
    updatedAt: new Date(),
  });
  if (variantResult.error) {
    return err('VALIDATION_ERROR', variantResult.error);
  }

  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    const variantId = variantResult.variantIds[index];
    if (!variant || !variantId) continue;
    if (
      variant.mediaAssetIds.length === 0 &&
      variant.orderedImageIds.length === 0 &&
      variant.removeImageIds.length === 0
    ) {
      continue;
    }
    const variantMediaResult = await persistProductVariantMedia({
      productId: existing.id,
      variantId,
      mediaAssetIds: variant.mediaAssetIds,
      orderedImageIds: variant.orderedImageIds,
      primaryNewIndex: variant.primaryNewIndex,
      primaryExistingId: variant.primaryExistingId,
      removeImageIds: variant.removeImageIds,
    });
    if (variantMediaResult.error) {
      return err('VALIDATION_ERROR', variantMediaResult.error);
    }
  }

  const categoryError = await syncProductCategories(existing.id, data.categoryIds);
  if (categoryError) {
    return err('VALIDATION_ERROR', categoryError);
  }

  const mediaResult = await persistProductMedia({
    productId: existing.id,
    mediaAssetIds: data.mediaAssetIds,
    primaryNewIndex: data.primaryNewIndex ?? null,
    primaryExistingId: data.primaryExistingId ?? null,
    removeImageIds: data.removeImageIds,
  });
  if (mediaResult.error) {
    return err('VALIDATION_ERROR', mediaResult.error);
  }

  const previousSlug =
    existing.translations.hy?.slug ??
    existing.translations.en?.slug ??
    existing.translations.ru?.slug;

  revalidateProducts(locale, {
    id: existing.id,
    slug: data.slug,
    previousSlug,
  });
  return ok({ id: existing.id });
}
