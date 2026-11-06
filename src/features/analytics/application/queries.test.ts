import { describe, expect, it } from "vitest";

import {
  buildAnalyticsCsv,
  guardCsvCell,
} from "@/features/analytics/domain/csv";

describe("buildAnalyticsCsv", () => {
  it("prefixes formula-injection starters in string cells", () => {
    expect(guardCsvCell("=1+1")).toBe("'=1+1");
    expect(guardCsvCell("+cmd")).toBe("'+cmd");
    expect(guardCsvCell("-2")).toBe("'-2");
    expect(guardCsvCell("@sum")).toBe("'@sum");
  });

  it("quotes cells containing commas or quotes", () => {
    expect(guardCsvCell("a,b")).toBe('"a,b"');
    expect(guardCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("builds CSV with guarded date cells", () => {
    const csv = buildAnalyticsCsv([
      {
        date: "=2026-01-01",
        orderCount: 2,
        revenueAmount: 100,
        averageOrderValue: 50,
      },
    ]);

    expect(csv).toContain("'=2026-01-01,2,100,50");
    expect(csv.startsWith("date,orderCount,revenueAmount,averageOrderValue")).toBe(
      true,
    );
  });
});
