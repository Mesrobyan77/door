import {
  RatingDistribution,
  RatingStars,
} from "@/features/products/ui/ProductReviewRating";
import { ProductWriteReviewCta } from "@/features/products/ui/ProductWriteReviewCta";
import type { ProductReviewsView } from "@/features/reviews/application/queries";
import { buildReviewAggregate } from "@/features/reviews/domain/review-rules";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type ProductReviewsSectionProps = {
  locale: Locale;
  productId: string;
  productSlug: string;
  reviewsView: ProductReviewsView;
  isSignedIn: boolean;
  labels: Dictionary["product"];
};

function formatAverage(average: number): string {
  return average.toFixed(1);
}

export function ProductReviewsSection({
  locale,
  productId,
  productSlug,
  reviewsView,
  isSignedIn,
  labels,
}: ProductReviewsSectionProps) {
  const { reviews, viewerReview } = reviewsView;

  // Public aggregate is approved-only; fold the viewer's pending/rejected
  // rating into the PDP summary so their submission updates the header.
  const ratings = reviews.map((review) => review.rating);
  if (viewerReview && viewerReview.moderationStatus !== "APPROVED") {
    ratings.push(viewerReview.rating);
  }
  const aggregate = buildReviewAggregate(ratings);
  const isEmpty = aggregate.count === 0;

  return (
    <section className="flex w-full flex-col gap-8">
      <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-[minmax(10rem,14rem)_1fr] md:gap-12">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {labels.reviews}
          </h2>
          <p className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            {formatAverage(aggregate.average)}
          </p>
          <RatingStars average={aggregate.average} />
          <p className="text-sm text-gray-500">
            {labels.reviewCount.replace("{count}", String(aggregate.count))}
          </p>
        </div>

        <RatingDistribution aggregate={aggregate} />
      </div>

      {reviews.length > 0 ? (
        <ul className="flex w-full flex-col gap-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="w-full rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-gray-900">
                  {review.authorName}
                </p>
                <RatingStars average={review.rating} size="sm" />
              </div>
              {review.comment ? (
                <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <ProductWriteReviewCta
        locale={locale}
        productId={productId}
        productSlug={productSlug}
        canSubmit={reviewsView.canSubmit}
        isSignedIn={isSignedIn}
        existingReviewId={reviewsView.existingReviewId}
        viewerReview={reviewsView.viewerReview}
        showEmptyPrompt={isEmpty}
        labels={{
          writeReview: labels.writeReview,
          writeReviewTitle: labels.writeReviewTitle,
          editReview: labels.editReview,
          editReviewTitle: labels.editReviewTitle,
          ratingLabel: labels.ratingLabel,
          yourReviewLabel: labels.yourReviewLabel,
          reviewPlaceholder: labels.reviewPlaceholder,
          submitReview: labels.submitReview,
          submittingReview: labels.submittingReview,
          saveReview: labels.saveReview,
          savingReview: labels.savingReview,
          cancelReview: labels.cancelReview,
          reviewPending: labels.reviewPending,
          emptyPrompt: labels.emptyPrompt,
          alreadyReviewed: labels.alreadyReviewed,
          reviewsUnlock: labels.reviewsUnlock,
          signIn: labels.signIn,
          signInToReview: labels.signInToReview,
        }}
      />
    </section>
  );
}
