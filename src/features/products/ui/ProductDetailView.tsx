import Link from 'next/link';

import { ProductVariantExperience } from '@/features/products/ui/ProductVariantExperience';
import type { ProductDetail, ProductVariantOption } from '@/features/products/types';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import type { Locale } from '@/lib/i18n/config';

type ProductDetailViewProps = {
  locale: Locale;
  product: ProductDetail;
  variants: Array<
    ProductVariantOption & {
      priceFormatted: string | null;
      compareAtFormatted: string | null;
    }
  >;
  isSignedIn: boolean;
  inWishlist: boolean;
  dictionary: Dictionary;
  jsonLd: Record<string, unknown>;
  relatedSlot: React.ReactNode;
  reviewsSlot: React.ReactNode;
};

export function ProductDetailView({
  locale,
  product,
  variants,
  isSignedIn,
  inWishlist,
  dictionary,
  jsonLd,
  relatedSlot,
  reviewsSlot,
}: ProductDetailViewProps) {
  const labels = dictionary.product;
  const specifications = product.doorSpecifications;
  const performance = specifications.performanceSpecifications;
  const specificationRows: Array<[string, string | null]> = [
    [labels.variant.brand, specifications.brandName],
    [labels.variant.model, specifications.modelName],
    [labels.variant.collection, specifications.collectionName],
    [
      labels.variant.classification,
      specifications.classification === 'INTERIOR'
        ? labels.variant.interior
        : specifications.classification === 'ENTRANCE'
          ? labels.variant.entrance
          : null,
    ],
    [
      labels.variant.installationEnvironment,
      specifications.entranceEnvironments
        ?.map((environment) =>
          environment === 'APARTMENT' ? labels.variant.apartment : labels.variant.outdoorHouse,
        )
        .join(', ') ?? null,
    ],
    [
      labels.variant.mechanism,
      specifications.openingMechanism === 'HINGED'
        ? labels.variant.hinged
        : specifications.openingMechanism === 'SLIDING'
          ? labels.variant.sliding
          : specifications.openingMechanism === 'FOLDING'
            ? labels.variant.folding
            : null,
    ],
    [
      labels.variant.frameSystem,
      specifications.frameSystem === 'STANDARD'
        ? labels.variant.standardFrame
        : specifications.frameSystem === 'CONCEALED'
          ? labels.variant.concealedFrame
          : null,
    ],
    [
      labels.variant.leafConfiguration,
      specifications.leafConfiguration === 'SINGLE'
        ? labels.variant.singleLeaf
        : specifications.leafConfiguration === 'DOUBLE'
          ? labels.variant.doubleLeaf
          : specifications.leafConfiguration === 'UNEQUAL_DOUBLE'
            ? labels.variant.unequalDoubleLeaf
            : null,
    ],
    [labels.variant.structuralMaterial, specifications.structuralMaterial],
    [labels.variant.coreMaterial, specifications.coreMaterial],
    [labels.variant.surfaceCoating, specifications.surfaceCoating],
    [
      labels.variant.glazing,
      specifications.hasGlazing == null
        ? null
        : specifications.hasGlazing
          ? labels.variant.yes
          : labels.variant.no,
    ],
    [labels.variant.glazingType, specifications.glazingType],
    [labels.variant.manufacturer, specifications.manufacturer],
    [labels.variant.countryOfManufacture, specifications.countryOfManufacture],
    [
      labels.variant.thermalBreak,
      performance?.thermalBreak == null
        ? null
        : performance.thermalBreak
          ? labels.variant.yes
          : labels.variant.no,
    ],
    [
      labels.variant.thermalTransmittance,
      performance?.thermalTransmittance
        ? `${performance.thermalTransmittance.value} ${performance.thermalTransmittance.unit}`
        : null,
    ],
    [
      labels.variant.soundReduction,
      performance?.soundReduction
        ? `${performance.soundReduction.value} ${performance.soundReduction.unit}`
        : null,
    ],
    [
      labels.variant.fireClassification,
      performance?.fireClassification
        ? `${performance.fireClassification.value}${
            performance.fireClassification.standard
              ? ` (${performance.fireClassification.standard})`
              : ''
          }`
        : null,
    ],
    [
      labels.variant.securityClassification,
      performance?.securityClassification
        ? `${performance.securityClassification.value}${
            performance.securityClassification.standard
              ? ` (${performance.securityClassification.standard})`
              : ''
          }`
        : null,
    ],
  ];

  return (
    <article className="product-detail flex flex-col gap-8 md:gap-12">
      <p className="text-sm text-gray-600">
        <Link
          href={`/${locale}/products`}
          className="font-medium text-gray-900 underline-offset-2 hover:underline"
        >
          {labels.backToProducts}
        </Link>
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductVariantExperience
          locale={locale}
          product={product}
          variants={variants}
          inWishlist={inWishlist}
          isSignedIn={isSignedIn}
          wishlistLabel={dictionary.nav.wishlist}
          variantCopy={labels.variant}
          labels={{
            quantity: labels.quantity,
            decreaseQuantity: dictionary.cartDrawer.decreaseQuantity,
            increaseQuantity: dictionary.cartDrawer.increaseQuantity,
            addToCart: labels.addToCart,
            adding: labels.adding,
            outOfStock: labels.outOfStock,
            added: labels.added,
            error: labels.addError,
            sku: labels.sku,
            inStock: labels.inStock,
            selectValue: labels.selectValue,
          }}
        >
          {product.categories.length > 0 ? (
            <p className="text-sm font-medium text-gray-500">
              {product.categories.map((category) => category.title).join(' · ')}
            </p>
          ) : null}

          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            {product.translation.title}
          </h1>

          {product.translation.description ? (
            <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-600">
              {product.translation.description}
            </p>
          ) : null}
        </ProductVariantExperience>
      </div>

      {specificationRows.some(([, value]) => value != null) ? (
        <section className="space-y-5 rounded-lg border border-border bg-white p-5 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900">
            {labels.variant.productSpecifications}
          </h2>
          <dl className="grid grid-cols-1 gap-x-10 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {specificationRows
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-border pb-3">
                  <dt className="text-gray-500">{label}:</dt>
                  <dd className="font-medium text-gray-800">{value}</dd>
                </div>
              ))}
          </dl>
        </section>
      ) : null}
      {relatedSlot}
      {reviewsSlot}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}
