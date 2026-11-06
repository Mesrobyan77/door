import type { OrderVariantSnapshot } from "@/db/schema/orders";
import { formatVariantConfiguration } from "@/features/products/domain/format-variant-configuration";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export function formatOrderItemConfiguration(
  sku: string,
  snapshot: OrderVariantSnapshot | null,
  labels: Dictionary["product"]["variant"],
): string {
  if (!snapshot) return "";

  const product = snapshot.product;
  const productDetails = [
    product?.brandName,
    product?.modelName,
    product?.collectionName,
  ].filter((value): value is string => Boolean(value));

  if (product?.classification) {
    productDetails.push(
      product.classification === "INTERIOR" ? labels.interior : labels.entrance,
    );
  }
  if (product?.openingMechanism) {
    productDetails.push(
      product.openingMechanism === "HINGED"
        ? labels.hinged
        : product.openingMechanism === "SLIDING"
          ? labels.sliding
          : labels.folding,
    );
  }

  const configuration = formatVariantConfiguration(
    {
      sku,
      itemType: snapshot.itemType,
      leafWidthMm: snapshot.dimensionsMm.leafWidth ?? null,
      leafHeightMm: snapshot.dimensionsMm.leafHeight ?? null,
      leafThicknessMm: snapshot.dimensionsMm.leafThickness ?? null,
      secondaryLeafWidthMm:
        snapshot.dimensionsMm.secondaryLeafWidth ?? null,
      unitWidthMm: snapshot.dimensionsMm.unitWidth ?? null,
      unitHeightMm: snapshot.dimensionsMm.unitHeight ?? null,
      frameDepthMm: snapshot.dimensionsMm.frameDepth ?? null,
      roughOpeningWidthMm:
        snapshot.dimensionsMm.roughOpeningWidth ?? null,
      roughOpeningHeightMm:
        snapshot.dimensionsMm.roughOpeningHeight ?? null,
      colorName: snapshot.appearance.color ?? null,
      finishName: snapshot.appearance.finish ?? null,
      exteriorColorName: snapshot.appearance.exteriorColor ?? null,
      exteriorFinishName: snapshot.appearance.exteriorFinish ?? null,
      handing: snapshot.handing ?? null,
      swing: snapshot.swing ?? null,
      includedComponents: snapshot.includedComponents ?? null,
    },
    labels,
    false,
  );

  return [...productDetails, configuration].join(" · ");
}
