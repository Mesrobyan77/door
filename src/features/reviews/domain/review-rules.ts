export const REVIEW_MODERATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

export type ReviewModerationStatus =
  (typeof REVIEW_MODERATION_STATUSES)[number];

/** Order statuses that unlock verified-purchase review eligibility. */
export const REVIEW_ELIGIBLE_ORDER_STATUSES = ["DELIVERED"] as const;

export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const REVIEW_COMMENT_MAX_LENGTH = 2_000;

export function isReviewModerationStatus(
  value: string,
): value is ReviewModerationStatus {
  return (REVIEW_MODERATION_STATUSES as readonly string[]).includes(value);
}

export function isValidReviewRating(rating: number): boolean {
  return (
    Number.isInteger(rating) &&
    rating >= REVIEW_RATING_MIN &&
    rating <= REVIEW_RATING_MAX
  );
}

/**
 * Strips HTML/tags and collapses whitespace for plain-text review comments.
 */
export function sanitizeReviewComment(raw: string | null | undefined): string {
  if (!raw) {
    return "";
  }

  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>&]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, REVIEW_COMMENT_MAX_LENGTH);
}

export function isReviewEligibleOrderStatus(status: string): boolean {
  return (REVIEW_ELIGIBLE_ORDER_STATUSES as readonly string[]).includes(status);
}

/** Owner may edit their review in any moderation state. */
export function canEditOwnReview(status: ReviewModerationStatus): boolean {
  return isReviewModerationStatus(status);
}

export type RatingDistribution = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type ReviewAggregate = {
  count: number;
  average: number;
  distribution: RatingDistribution;
};

/** Builds public aggregates from approved ratings only. */
export function buildReviewAggregate(ratings: readonly number[]): ReviewAggregate {
  const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const rating of ratings) {
    if (!isValidReviewRating(rating)) {
      continue;
    }
    distribution[rating as 1 | 2 | 3 | 4 | 5] += 1;
  }

  const count = ratings.filter(isValidReviewRating).length;
  const sum = ratings.reduce(
    (acc, rating) => (isValidReviewRating(rating) ? acc + rating : acc),
    0,
  );
  const average = count === 0 ? 0 : Math.round((sum / count) * 10) / 10;

  return { count, average, distribution };
}
