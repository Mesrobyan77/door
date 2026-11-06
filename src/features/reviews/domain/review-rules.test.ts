import { describe, expect, it } from "vitest";

import {
  buildReviewAggregate,
  canEditOwnReview,
  isReviewEligibleOrderStatus,
  isValidReviewRating,
  sanitizeReviewComment,
} from "@/features/reviews/domain/review-rules";

describe("review rules", () => {
  it("accepts ratings 1–5 only", () => {
    expect(isValidReviewRating(1)).toBe(true);
    expect(isValidReviewRating(5)).toBe(true);
    expect(isValidReviewRating(0)).toBe(false);
    expect(isValidReviewRating(3.5)).toBe(false);
  });

  it("sanitizes HTML and truncates comments", () => {
    expect(sanitizeReviewComment('<script>alert(1)</script>Great')).toBe(
      "alert(1) Great",
    );
    expect(sanitizeReviewComment("  nice   product  ")).toBe("nice product");
  });

  it("limits eligibility to delivered orders", () => {
    expect(isReviewEligibleOrderStatus("DELIVERED")).toBe(true);
    expect(isReviewEligibleOrderStatus("SHIPPED")).toBe(false);
    expect(isReviewEligibleOrderStatus("REFUNDED")).toBe(false);
  });

  it("allows owners to edit reviews in any moderation state", () => {
    expect(canEditOwnReview("PENDING")).toBe(true);
    expect(canEditOwnReview("APPROVED")).toBe(true);
    expect(canEditOwnReview("REJECTED")).toBe(true);
  });

  it("builds aggregates from approved ratings", () => {
    expect(buildReviewAggregate([5, 4, 5, 3])).toEqual({
      count: 4,
      average: 4.3,
      distribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 },
    });
    expect(buildReviewAggregate([])).toEqual({
      count: 0,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });
});
