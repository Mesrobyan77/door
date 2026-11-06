import { ProductReviewsSection } from "@/features/products/ui/ProductReviewsSection";
import { getProductReviewsView } from "@/features/reviews/application/queries";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type ProductReviewsIslandProps = {
  locale: Locale;
  productId: string;
  productSlug: string;
  userId: string | undefined;
  isSignedIn: boolean;
  dictionary: Dictionary;
};

/** Streams reviews below the fold after the main PDP chrome. */
export async function ProductReviewsIsland({
  locale,
  productId,
  productSlug,
  userId,
  isSignedIn,
  dictionary,
}: ProductReviewsIslandProps) {
  const reviewsView = await getProductReviewsView(productId, userId);

  return (
    <ProductReviewsSection
      locale={locale}
      productId={productId}
      productSlug={productSlug}
      reviewsView={reviewsView}
      isSignedIn={isSignedIn}
      labels={dictionary.product}
    />
  );
}
