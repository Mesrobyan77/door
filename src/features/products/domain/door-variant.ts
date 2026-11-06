import type {
  IncludedComponent,
  ProductVariantStatus,
  VariantItemType,
} from "@/db/schema/variants";

export type DoorVariantConfiguration = {
  itemType: VariantItemType;
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
  handing: string | null;
  swing: string | null;
  includedComponents: IncludedComponent[] | null;
};

export function configurationIdentity(
  configuration: DoorVariantConfiguration,
): string {
  const normalize = (value: string | null): string | null =>
    value?.trim().toLocaleLowerCase("en-US") || null;

  return JSON.stringify([
    configuration.itemType,
    configuration.leafWidthMm,
    configuration.leafHeightMm,
    configuration.leafThicknessMm,
    configuration.secondaryLeafWidthMm,
    configuration.unitWidthMm,
    configuration.unitHeightMm,
    configuration.frameDepthMm,
    configuration.roughOpeningWidthMm,
    configuration.roughOpeningHeightMm,
    normalize(configuration.colorName),
    normalize(configuration.finishName),
    normalize(configuration.exteriorColorName),
    normalize(configuration.exteriorFinishName),
    configuration.handing,
    configuration.swing,
    (configuration.includedComponents ?? [])
      .map((component) => [
        component.code,
        component.status,
        component.quantity ?? null,
      ])
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
  ]);
}

export type PurchaseReadiness = {
  product: {
    doorClassification: string | null;
    openingMechanism: string | null;
  };
  variant: DoorVariantConfiguration & {
    status: ProductVariantStatus;
    priceAmount: number | null;
    stockOnHand: number;
  };
};

export function isVariantPurchasable(input: PurchaseReadiness): boolean {
  const { product, variant } = input;
  if (
    variant.status !== "ACTIVE" ||
    variant.priceAmount === null ||
    variant.stockOnHand < 1
  ) {
    return false;
  }

  if (variant.itemType === "LEGACY") {
    return true;
  }
  if (!product.doorClassification) {
    return false;
  }

  if (
    variant.itemType === "LEAF_ONLY" &&
    (!variant.leafWidthMm || !variant.leafHeightMm)
  ) {
    return false;
  }
  if (
    (variant.itemType === "FRAMED_UNIT" ||
      variant.itemType === "FIXED_PACKAGE") &&
    (!variant.unitWidthMm || !variant.unitHeightMm)
  ) {
    return false;
  }

  if (product.openingMechanism === "HINGED") {
    return (
      (variant.handing === "LEFT" ||
        variant.handing === "RIGHT" ||
        variant.handing === "REVERSIBLE") &&
      (variant.swing === "INWARD" || variant.swing === "OUTWARD")
    );
  }
  return true;
}
