import { describe, expect, it } from "vitest";

import {
  configurationIdentity,
  isVariantPurchasable,
  type DoorVariantConfiguration,
} from "@/features/products/domain/door-variant";

const base: DoorVariantConfiguration = {
  itemType: "FRAMED_UNIT",
  leafWidthMm: 800,
  leafHeightMm: 2000,
  leafThicknessMm: 40,
  secondaryLeafWidthMm: null,
  unitWidthMm: 900,
  unitHeightMm: 2050,
  frameDepthMm: 100,
  roughOpeningWidthMm: null,
  roughOpeningHeightMm: null,
  colorName: "White",
  finishName: "Matte",
  exteriorColorName: null,
  exteriorFinishName: null,
  handing: "LEFT",
  swing: "INWARD",
  includedComponents: [
    { code: "FRAME", status: "INCLUDED", quantity: 1 },
  ],
};

describe("door variant configuration", () => {
  it("normalizes appearance when defining duplicate configurations", () => {
    expect(configurationIdentity(base)).toBe(
      configurationIdentity({ ...base, colorName: " white " }),
    );
    expect(configurationIdentity(base)).not.toBe(
      configurationIdentity({ ...base, unitWidthMm: 910 }),
    );
  });

  it("requires a resolved hinged opening choice before purchase", () => {
    const product = {
      doorClassification: "INTERIOR",
      openingMechanism: "HINGED",
    };
    const variant = {
      ...base,
      status: "ACTIVE" as const,
      priceAmount: 100_000,
      stockOnHand: 2,
    };

    expect(isVariantPurchasable({ product, variant })).toBe(true);
    expect(
      isVariantPurchasable({
        product,
        variant: { ...variant, handing: null },
      }),
    ).toBe(false);
  });

  it("does not make inquiry, unpriced, or unavailable variants purchasable", () => {
    const product = {
      doorClassification: "ENTRANCE",
      openingMechanism: "HINGED",
    };
    const variant = {
      ...base,
      status: "ACTIVE" as const,
      priceAmount: 100_000,
      stockOnHand: 2,
    };

    expect(
      isVariantPurchasable({
        product,
        variant: { ...variant, status: "INQUIRY" },
      }),
    ).toBe(false);
    expect(
      isVariantPurchasable({
        product,
        variant: { ...variant, priceAmount: null },
      }),
    ).toBe(false);
    expect(
      isVariantPurchasable({
        product,
        variant: { ...variant, stockOnHand: 0 },
      }),
    ).toBe(false);
  });
});
