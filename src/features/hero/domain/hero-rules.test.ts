import { describe, expect, it } from "vitest";

import {
  resolveHeroTranslation,
  validateHeroLocaleCopy,
  validateHeroTranslations,
} from "@/features/hero/domain/hero-rules";

describe("hero rules", () => {
  it("accepts a valid slide copy", () => {
    expect(
      validateHeroLocaleCopy({
        title: "White Shop",
        subtitle: "New collection",
        buttonLabel: "Shop",
        buttonUrl: "/en/products",
      }),
    ).toBeNull();
  });

  it("rejects invalid button URL and mismatched button fields", () => {
    expect(
      validateHeroLocaleCopy({
        title: "X",
        buttonLabel: "Go",
        buttonUrl: "javascript:alert(1)",
      }),
    ).toBe("INVALID_BUTTON_URL");

    expect(
      validateHeroLocaleCopy({
        title: "X",
        buttonLabel: "Go",
      }),
    ).toBe("BUTTON_LABEL_WITHOUT_URL");
  });

  it("requires at least one locale title set", () => {
    expect(validateHeroTranslations({})).toBe("TITLE_REQUIRED");
  });

  it("resolves locale with fallbacks", () => {
    expect(
      resolveHeroTranslation(
        {
          en: { title: "EN" },
          hy: { title: "HY" },
        },
        "ru",
      ),
    ).toEqual({ title: "EN" });
  });
});
