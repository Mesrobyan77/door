import { describe, expect, it } from "vitest";

import {
  formatAnalyticsDisplayDate,
  matchAnalyticsPeriodPreset,
  rangeForAnalyticsPeriod,
} from "@/features/analytics/domain/date-range";

describe("rangeForAnalyticsPeriod", () => {
  it("returns an inclusive last-7-days window", () => {
    const range = rangeForAnalyticsPeriod("last_7_days");
    const start = new Date(`${range.from}T00:00:00.000Z`);
    const end = new Date(`${range.to}T00:00:00.000Z`);
    const days =
      Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    expect(days).toBe(7);
    expect(range.from <= range.to).toBe(true);
  });

  it("matches preset detection for generated ranges", () => {
    const range = rangeForAnalyticsPeriod("last_30_days");
    expect(matchAnalyticsPeriodPreset(range)).toBe("last_30_days");
  });
});

describe("formatAnalyticsDisplayDate", () => {
  it("formats UTC ISO dates for headers", () => {
    expect(formatAnalyticsDisplayDate("2026-07-12")).toBe("Jul 12, 2026");
  });
});
