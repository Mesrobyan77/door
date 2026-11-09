import { z } from 'zod';

const localeTextSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(1),
});

const translationsSchema = z.object({
  hy: localeTextSchema,
  en: localeTextSchema,
  ru: localeTextSchema,
});

const evidenceSchema = z.object({
  fields: z.array(z.string().min(1)).min(1),
  sourceUrl: z.string().url(),
  sourceNote: z.string().min(1),
});

const variantSchema = z.object({
  sku: z.string().regex(/^HD-[A-Z0-9-]+$/),
  configurationKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  itemType: z.enum(['LEGACY', 'LEAF_ONLY', 'FRAMED_UNIT', 'FIXED_PACKAGE']),
  status: z.literal('INQUIRY'),
  sourceConfiguration: z.string().min(1),
  leafWidthMm: z.number().int().positive().nullable(),
  leafHeightMm: z.number().int().positive().nullable(),
  leafThicknessMm: z.number().int().positive().nullable(),
  unitWidthMm: z.number().int().positive().nullable(),
  unitHeightMm: z.number().int().positive().nullable(),
  frameDepthMm: z.number().int().positive().nullable(),
  colorName: z.string().min(1).nullable(),
  finishName: z.string().min(1).nullable(),
  handing: z.enum(['LEFT', 'RIGHT', 'REVERSIBLE', 'NOT_APPLICABLE']).nullable(),
  swing: z.enum(['INWARD', 'OUTWARD', 'NOT_APPLICABLE']).nullable(),
  includedComponents: z.array(
    z.object({
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
    }),
  ),
});

const productSchema = z.object({
  recordKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sku: z.string().regex(/^HD-[A-Z0-9-]+$/),
  categoryKey: z.string().min(1),
  categoryKeys: z.array(z.string().min(1)).min(1),
  classification: z.enum(['INTERIOR', 'ENTRANCE']),
  brand: z.string().min(1),
  model: z.string().min(1),
  collection: z.string().min(1).nullable(),
  manufacturer: z.string().min(1).nullable(),
  countryOfManufacture: z.string().min(1).nullable(),
  structuralMaterial: z.string().min(1).nullable(),
  coreMaterial: z.string().min(1).nullable(),
  surfaceCoating: z.string().min(1).nullable(),
  hasGlazing: z.boolean().nullable(),
  glazingType: z.string().min(1).nullable(),
  entranceEnvironments: z.array(z.enum(['APARTMENT', 'OUTDOOR_HOUSE'])).nullable(),
  translations: translationsSchema,
  source: z.object({
    sourceKey: z.string().min(1),
    retailerOrManufacturer: z.string().min(1),
    url: z.string().url(),
    retrievedAt: z.string().date(),
    originalId: z.string().min(1),
    observedPrice: z
      .object({
        amount: z.number().int().nonnegative(),
        currency: z.literal('AMD'),
        basis: z.enum(['LEAF_ONLY', 'COMPLETE_UNIT', 'UNKNOWN']),
        promotional: z.boolean(),
        regularAmount: z.number().int().nonnegative().nullable(),
      })
      .nullable(),
    evidence: z.array(evidenceSchema).min(1),
    imagePageUrl: z.string().url(),
    imageUrl: z.string().url().nullable(),
    reusePermission: z.literal('UNKNOWN'),
  }),
  unknownFields: z.array(z.string().min(1)),
  conflicts: z.array(z.string().min(1)),
  generatedFields: z.array(z.string().min(1)),
  variant: variantSchema,
});

export const hdoorsCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    publicBrand: z.literal('Hdoors'),
    retrievedAt: z.string().date(),
    categories: z
      .array(
        z.object({
          key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          translations: translationsSchema,
          sortOrder: z.number().int().positive(),
        }),
      )
      .length(10),
    products: z.array(productSchema).length(30),
  })
  .superRefine((dataset, ctx) => {
    const uniqueSets: Array<[string, string[]]> = [
      ['product SKU', dataset.products.map((product) => product.sku)],
      ['variant SKU', dataset.products.map((product) => product.variant.sku)],
      ['record key', dataset.products.map((product) => product.recordKey)],
    ];
    for (const locale of ['hy', 'en', 'ru'] as const) {
      uniqueSets.push([
        `${locale} slug`,
        dataset.products.map((product) => product.translations[locale].slug),
      ]);
    }
    for (const [label, values] of uniqueSets) {
      if (new Set(values).size !== values.length) {
        ctx.addIssue({ code: 'custom', message: `Duplicate ${label} in catalog dataset.` });
      }
    }

    for (const [index, product] of dataset.products.entries()) {
      if (
        product.categoryKeys[0] !== product.categoryKey ||
        product.categoryKeys.some(
          (key) => !dataset.categories.some((category) => category.key === key),
        )
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['products', index, 'categoryKeys'],
          message: 'Product category keys must exist and begin with the primary category.',
        });
      }
      if (product.categoryKey === 'interior' && product.classification !== 'INTERIOR') {
        ctx.addIssue({
          code: 'custom',
          path: ['products', index],
          message: 'Interior category/classification mismatch.',
        });
      }
      if (product.categoryKey === 'entrance' && product.classification !== 'ENTRANCE') {
        ctx.addIssue({
          code: 'custom',
          path: ['products', index],
          message: 'Entrance category/classification mismatch.',
        });
      }
      const variant = product.variant;
      if (variant.itemType === 'LEAF_ONLY' && (!variant.leafWidthMm || !variant.leafHeightMm)) {
        ctx.addIssue({
          code: 'custom',
          path: ['products', index, 'variant'],
          message: 'Leaf-only variants require explicit leaf dimensions.',
        });
      }
      if (
        (variant.itemType === 'FRAMED_UNIT' || variant.itemType === 'FIXED_PACKAGE') &&
        (!variant.unitWidthMm || !variant.unitHeightMm)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['products', index, 'variant'],
          message: 'Framed/fixed variants require explicit unit dimensions.',
        });
      }
    }
  });

export type HdoorsCatalog = z.infer<typeof hdoorsCatalogSchema>;

export function validateHdoorsCatalog(input: unknown): HdoorsCatalog {
  return hdoorsCatalogSchema.parse(input);
}
