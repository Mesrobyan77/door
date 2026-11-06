import { describe, expect, it } from "vitest";

import { defaultLocale, isLocale, locales } from "@/lib/i18n/config";

describe("i18n config", () => {
  it("exposes hy, en, ru with hy as default", () => {
    expect(locales).toEqual(["hy", "en", "ru"]);
    expect(defaultLocale).toBe("hy");
  });

  it("validates locale values", () => {
    expect(isLocale("hy")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });
});
