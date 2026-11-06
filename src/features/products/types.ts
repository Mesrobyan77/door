type LocaleTranslation = {
  title: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type CatalogProduct = {
  id: string;
  sku: string;
  /** Catalog list price before automatic discount. */
  listPriceAmount: number | null;
  /** Customer-facing unit price after automatic discount. */
  priceAmount: number | null;
  compareAtAmount: number | null;
  discountPercent: number | null;
  stockOnHand: number;
  translation: LocaleTranslation;
  imageUrl: string | null;
  variants: ProductVariantOption[];
  doorSpecifications: {
    brandName: string | null;
    modelName: string | null;
    collectionName: string | null;
    classification: "INTERIOR" | "ENTRANCE" | null;
    entranceEnvironments: ("APARTMENT" | "OUTDOOR_HOUSE")[] | null;
    structuralMaterial: string | null;
    coreMaterial: string | null;
    surfaceCoating: string | null;
    hasGlazing: boolean | null;
    glazingType: string | null;
    manufacturer: string | null;
    countryOfManufacture: string | null;
    openingMechanism: string | null;
    frameSystem: string | null;
    leafConfiguration: string | null;
    performanceSpecifications:
      | {
          thermalBreak?: boolean | null;
          thermalTransmittance?: { value: number; unit: string } | null;
          soundReduction?: { value: number; unit: string } | null;
          fireClassification?: { value: string; standard?: string } | null;
          securityClassification?: { value: string; standard?: string } | null;
        }
      | null;
  };
};

export type ProductVariantOption = {
  id: string;
  sku: string;
  itemType: "LEGACY" | "LEAF_ONLY" | "FRAMED_UNIT" | "FIXED_PACKAGE";
  status: "ACTIVE" | "INQUIRY";
  priceAmount: number | null;
  compareAtAmount: number | null;
  discountPercent?: number | null;
  stockOnHand: number;
  leafWidthMm: number | null;
  leafHeightMm: number | null;
  leafThicknessMm: number | null;
  secondaryLeafWidthMm: number | null;
  unitWidthMm: number | null;
  unitHeightMm: number | null;
  frameDepthMm: number | null;
  roughOpeningWidthMm: number | null;
  roughOpeningHeightMm: number | null;
  colorName: string | null;
  finishName: string | null;
  exteriorColorName: string | null;
  exteriorFinishName: string | null;
  handing: "LEFT" | "RIGHT" | "REVERSIBLE" | "NOT_APPLICABLE" | null;
  swing: "INWARD" | "OUTWARD" | "NOT_APPLICABLE" | null;
  includedComponents: import("@/db/schema/variants").IncludedComponent[] | null;
  imageUrl: string | null;
  purchasable: boolean;
};

export type ProductVariantDraft = Omit<
  ProductVariantOption,
  "purchasable" | "imageUrl" | "id" | "status"
> & {
  id?: string;
  status: "ACTIVE" | "INQUIRY" | "ARCHIVED";
  lowStockThreshold: number;
};

export type ProductGalleryImage = {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
};

export type ProductCategoryRef = {
  id: string;
  title: string;
  slug: string;
};

export type ProductDetail = CatalogProduct & {
  images: ProductGalleryImage[];
  categories: ProductCategoryRef[];
};
