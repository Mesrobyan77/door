export type AnalyticsCsvRow = {
  date: string;
  orderCount: number;
  revenueAmount: number;
  averageOrderValue: number;
};

/** Escapes CSV cells and prefixes formula-injection starters. */
export function guardCsvCell(value: string): string {
  let cell = value;
  if (/^[=+\-@]/.test(cell)) {
    cell = `'${cell}`;
  }
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

/** Builds a CSV export from daily analytics rows. */
export function buildAnalyticsCsv(rows: AnalyticsCsvRow[]): string {
  const header = [
    "date",
    "orderCount",
    "revenueAmount",
    "averageOrderValue",
  ].join(",");

  const body = rows.map((row) =>
    [
      guardCsvCell(row.date),
      String(row.orderCount),
      String(row.revenueAmount),
      String(row.averageOrderValue),
    ].join(","),
  );

  return [header, ...body].join("\n");
}
