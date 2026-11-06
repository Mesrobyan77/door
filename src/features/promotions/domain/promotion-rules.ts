export const PROMOTION_KINDS = ["COUPON", "AUTOMATIC"] as const;
export type PromotionKind = (typeof PROMOTION_KINDS)[number];

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

/** Normalizes coupon codes for storage and unique matching. */
export function normalizePromotionCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export type PromotionRuleInput = {
  kind: PromotionKind;
  code?: string | null;
  productId?: string | null;
  categoryId?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

export type PromotionRuleError =
  | "CODE_REQUIRED"
  | "CODE_FORBIDDEN"
  | "TARGET_REQUIRED"
  | "TARGET_FORBIDDEN"
  | "SINGLE_TARGET"
  | "INVALID_PERCENTAGE"
  | "INVALID_FIXED"
  | "INVALID_MAX_DISCOUNT"
  | "INVALID_MINIMUM_ORDER"
  | "INVALID_DATE_RANGE";

/** Pure validation of promotion kind/target/discount/date invariants. */
export function validatePromotionRules(
  input: PromotionRuleInput,
): PromotionRuleError | null {
  if (input.kind === "COUPON") {
    if (!input.code || input.code.length === 0) {
      return "CODE_REQUIRED";
    }
    if (input.productId || input.categoryId) {
      return "TARGET_FORBIDDEN";
    }
  }

  if (input.kind === "AUTOMATIC") {
    if (input.code) {
      return "CODE_FORBIDDEN";
    }
    if (!input.productId && !input.categoryId) {
      return "TARGET_REQUIRED";
    }
  }

  if (input.productId && input.categoryId) {
    return "SINGLE_TARGET";
  }

  if (input.discountType === "PERCENTAGE") {
    if (input.discountValue < 1 || input.discountValue > 100) {
      return "INVALID_PERCENTAGE";
    }
  } else if (input.discountValue < 1) {
    return "INVALID_FIXED";
  }

  if (
    input.maxDiscountAmount !== null &&
    input.maxDiscountAmount !== undefined &&
    input.maxDiscountAmount < 1
  ) {
    return "INVALID_MAX_DISCOUNT";
  }

  if (
    input.minimumOrderAmount !== null &&
    input.minimumOrderAmount !== undefined &&
    input.minimumOrderAmount < 0
  ) {
    return "INVALID_MINIMUM_ORDER";
  }

  if (
    input.startsAt &&
    input.endsAt &&
    input.endsAt.getTime() <= input.startsAt.getTime()
  ) {
    return "INVALID_DATE_RANGE";
  }

  return null;
}

/**
 * Computes an integer discount in base currency minor units.
 * Never exceeds the eligible subtotal.
 */
export function computeDiscountAmount(
  eligibleSubtotal: number,
  discountType: DiscountType,
  discountValue: number,
  maxDiscountAmount?: number | null,
): number {
  if (eligibleSubtotal <= 0) {
    return 0;
  }

  let discount =
    discountType === "PERCENTAGE"
      ? Math.floor((eligibleSubtotal * discountValue) / 100)
      : discountValue;

  if (maxDiscountAmount !== null && maxDiscountAmount !== undefined) {
    discount = Math.min(discount, maxDiscountAmount);
  }

  return Math.max(0, Math.min(discount, eligibleSubtotal));
}

export function promotionRuleErrorMessage(code: PromotionRuleError): string {
  switch (code) {
    case "CODE_REQUIRED":
      return "Coupon code is required.";
    case "CODE_FORBIDDEN":
      return "Automatic discounts cannot have a code.";
    case "TARGET_REQUIRED":
      return "Automatic discounts need a product or category target.";
    case "TARGET_FORBIDDEN":
      return "Order-level coupons cannot target a product or category.";
    case "SINGLE_TARGET":
      return "Choose either a product or a category, not both.";
    case "INVALID_PERCENTAGE":
      return "Percentage must be between 1 and 100.";
    case "INVALID_FIXED":
      return "Fixed discount must be at least 1.";
    case "INVALID_MAX_DISCOUNT":
      return "Max discount must be at least 1 when set.";
    case "INVALID_MINIMUM_ORDER":
      return "Minimum order cannot be negative.";
    case "INVALID_DATE_RANGE":
      return "End date must be after start date.";
  }
}
