import { describe, expect, it } from "vitest";

import productCopy from "@/locales/en/product.json";
import { formatVariantConfiguration } from "@/features/products/domain/format-variant-configuration";

const labels = productCopy.variant;

const variant = {
  sku: "DOOR-001",
  itemType: "FRAMED_UNIT" as const,
  leafWidthMm: null,
  leafHeightMm: null,
  leafThicknessMm: null,
  secondaryLeafWidthMm: null,
  unitWidthMm: 900,
  unitHeightMm: 2100,
  frameDepthMm: null,
  roughOpeningWidthMm: null,
  roughOpeningHeightMm: null,
  colorName: null,
  finishName: null,
  exteriorColorName: null,
  exteriorFinishName: null,
  handing: "LEFT" as const,
  swing: "INWARD" as const,
  includedComponents: null,
};

describe("formatVariantConfiguration", () => {
  it("clarifies the viewing convention for left/right handing", () => {
    const formatted = formatVariantConfiguration(variant, labels);

    expect(formatted).toContain(labels.viewingConvention);
    expect(formatted).toContain(`${labels.handing}: ${labels.left}`);
  });

  it("omits the viewing convention when handing is not applicable", () => {
    const formatted = formatVariantConfiguration(
      { ...variant, handing: "NOT_APPLICABLE" },
      labels,
    );

    expect(formatted).not.toContain(labels.viewingConvention);
  });
});
