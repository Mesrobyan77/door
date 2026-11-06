/**
 * Pure automatic-discount resolution for catalog and checkout pricing.
 * Precedence: product rule > best category rule > store global %.
 */

export type AutomaticDiscountSource = "product" | "category" | "global" | null;

export type AutomaticDiscountPick = {
  percent: number | null;
  source: AutomaticDiscountSource;
};

export type ResolvedCatalogPrice = {
  listAmount: number;
  unitAmount: number;
  compareAtAmount: number | null;
  discountPercent: number | null;
  source: AutomaticDiscountSource;
};

function normalizePercent(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 100) return null;
  return value;
}

/** Picks the winning automatic percentage for one product. */
export function pickAutomaticDiscountPercent(input: {
  productPercent?: number | null;
  categoryPercents?: ReadonlyArray<number | null | undefined>;
  globalPercent?: number | null;
}): AutomaticDiscountPick {
  const productPercent = normalizePercent(input.productPercent ?? null);
  if (productPercent != null) {
    return { percent: productPercent, source: "product" };
  }

  const categoryBest = (input.categoryPercents ?? [])
    .map((value) => normalizePercent(value ?? null))
    .filter((value): value is number => value != null)
    .reduce<number | null>(
      (best, value) => (best == null || value > best ? value : best),
      null,
    );

  if (categoryBest != null) {
    return { percent: categoryBest, source: "category" };
  }

  const globalPercent = normalizePercent(input.globalPercent ?? null);
  if (globalPercent != null) {
    return { percent: globalPercent, source: "global" };
  }

  return { percent: null, source: null };
}

/**
 * Applies a percentage to a list price.
 * Sale amount never goes below 0 and never exceeds the list price.
 */
export function applyPercentageToListPrice(
  listAmount: number,
  percent: number | null,
  source: AutomaticDiscountSource = null,
): ResolvedCatalogPrice {
  const safeList = Math.max(0, Math.floor(listAmount));
  const safePercent = normalizePercent(percent);

  if (safePercent == null) {
    return {
      listAmount: safeList,
      unitAmount: safeList,
      compareAtAmount: null,
      discountPercent: null,
      source: null,
    };
  }

  const discount = Math.floor((safeList * safePercent) / 100);
  const unitAmount = Math.max(0, safeList - discount);

  return {
    listAmount: safeList,
    unitAmount,
    compareAtAmount: unitAmount < safeList ? safeList : null,
    discountPercent: safePercent,
    source,
  };
}

/** Resolves final catalog unit price from list + automatic discount inputs. */
export function resolveCatalogPrice(input: {
  listAmount: number;
  productPercent?: number | null;
  categoryPercents?: ReadonlyArray<number | null | undefined>;
  globalPercent?: number | null;
  /** Manual compare-at from the product row when no automatic discount applies. */
  manualCompareAtAmount?: number | null;
}): ResolvedCatalogPrice {
  const picked = pickAutomaticDiscountPercent(input);
  const resolved = applyPercentageToListPrice(
    input.listAmount,
    picked.percent,
    picked.source,
  );

  if (resolved.discountPercent != null) {
    return resolved;
  }

  const manual = input.manualCompareAtAmount;
  if (
    manual != null &&
    Number.isInteger(manual) &&
    manual > resolved.unitAmount
  ) {
    return {
      ...resolved,
      compareAtAmount: manual,
    };
  }

  return resolved;
}
