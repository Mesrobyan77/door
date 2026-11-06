import { describe, expect, it } from 'vitest';

import {
  getMatchingCatalogVariant,
  parseCatalogFilters,
  parseDisplayPriceAmount,
} from '@/features/products/domain/catalog-filters';
import type { CatalogProduct, ProductVariantOption } from '@/features/products/types';

function variant(
  id: string,
  sku: string,
  priceAmount: number,
  stockOnHand: number,
): ProductVariantOption {
  return {
    id,
    sku,
    itemType: 'LEGACY',
    status: 'ACTIVE',
    priceAmount,
    compareAtAmount: null,
    discountPercent: null,
    stockOnHand,
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
    imageUrl: null,
    images: [],
    purchasable: stockOnHand > 0,
  };
}

function product(variants: ProductVariantOption[]): CatalogProduct {
  return {
    id: 'product',
    sku: 'DOOR',
    listPriceAmount: 1000,
    priceAmount: 1000,
    compareAtAmount: null,
    discountPercent: null,
    stockOnHand: variants.reduce(
      (total, item) => total + (item.purchasable ? item.stockOnHand : 0),
      0,
    ),
    translation: { title: 'Door', slug: 'door' },
    imageUrl: null,
    variants,
    doorSpecifications: {
      brandName: null,
      modelName: null,
      collectionName: null,
      classification: null,
      entranceEnvironments: null,
      structuralMaterial: null,
      coreMaterial: null,
      surfaceCoating: null,
      hasGlazing: null,
      glazingType: null,
      manufacturer: null,
      countryOfManufacture: null,
      openingMechanism: null,
      frameSystem: null,
      leafConfiguration: null,
      performanceSpecifications: null,
    },
  };
}

describe('catalog filters', () => {
  it('parses display-currency price input into minor units', () => {
    expect(parseDisplayPriceAmount('12.34', 'USD')).toBe(1234);
    expect(parseDisplayPriceAmount('12.3', 'USD')).toBe(1230);
    expect(parseDisplayPriceAmount('12.3', 'AMD')).toBeNull();
  });

  it('drops malformed and reversed ranges and unknown categories', () => {
    const filters = parseCatalogFilters(
      {
        minPrice: '200',
        maxPrice: '100',
        category: 'missing',
        page: '0',
        pageSize: '16',
      },
      'AMD',
      new Set(['doors']),
    );

    expect(filters).toMatchObject({
      minPrice: null,
      maxPrice: null,
      category: null,
      page: 1,
      pageSize: 24,
    });
  });

  it('requires price and stock conditions to match the same variant', () => {
    const door = product([
      variant('unavailable', 'DOOR-LOW', 1000, 0),
      variant('available', 'DOOR-HIGH', 5000, 2),
    ]);

    expect(
      getMatchingCatalogVariant(
        door,
        {
          minPrice: 0,
          maxPrice: 2000,
          priceCurrency: 'AMD',
          inStock: true,
        },
        '1',
      ),
    ).toBeNull();

    expect(
      getMatchingCatalogVariant(
        door,
        {
          minPrice: 3000,
          maxPrice: 6000,
          priceCurrency: 'AMD',
          inStock: true,
        },
        '1',
      )?.id,
    ).toBe('available');
  });
});
