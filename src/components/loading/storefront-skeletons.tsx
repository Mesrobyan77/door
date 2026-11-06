/** Shared pulse skeletons for storefront route `loading.tsx` boundaries. */

const pulse = "animate-pulse";

type SkeletonProps = {
  className?: string;
};

function Block({ className = "" }: SkeletonProps) {
  return <div className={`rounded-md bg-gray-200 ${className}`} />;
}

export function CatalogGridSkeleton() {
  return (
    <div className={`${pulse} space-y-6`} aria-busy="true" aria-live="polite">
      <Block className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
        <Block className="aspect-[4/3] rounded-lg" />
        <Block className="aspect-[4/3] rounded-lg" />
        <Block className="aspect-[4/3] rounded-lg" />
        <Block className="aspect-[4/3] rounded-lg" />
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div
      className={`${pulse} grid gap-8 lg:grid-cols-2`}
      aria-busy="true"
      aria-live="polite"
    >
      <Block className="aspect-square w-full rounded-lg" />
      <div className="space-y-4">
        <Block className="h-8 w-3/4" />
        <Block className="h-5 w-1/3" />
        <Block className="h-24 w-full" />
        <Block className="h-12 w-40 rounded-full" />
      </div>
    </div>
  );
}

export function BlogListSkeleton() {
  return (
    <div className={`${pulse} space-y-6`} aria-busy="true" aria-live="polite">
      <Block className="h-9 w-40" />
      <div className="flex flex-col gap-4">
        <Block className="h-36 w-full rounded-lg" />
        <Block className="h-36 w-full rounded-lg" />
        <Block className="h-36 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function BlogPostSkeleton() {
  return (
    <div className={`${pulse} space-y-6`} aria-busy="true" aria-live="polite">
      <Block className="h-4 w-32" />
      <Block className="h-10 w-3/4" />
      <Block className="aspect-[21/9] w-full rounded-lg" />
      <div className="space-y-3">
        <Block className="h-4 w-full" />
        <Block className="h-4 w-full" />
        <Block className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function CartCheckoutSkeleton() {
  return (
    <div
      className={`${pulse} flex max-w-2xl flex-col gap-4`}
      aria-busy="true"
      aria-live="polite"
    >
      <Block className="h-9 w-40" />
      <Block className="h-20 w-full rounded-lg" />
      <Block className="h-20 w-full rounded-lg" />
      <Block className="h-20 w-full rounded-lg" />
      <Block className="h-12 w-48 rounded-full" />
    </div>
  );
}

export function ProfileContentSkeleton() {
  return (
    <div className={`${pulse} space-y-8`} aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Block className="h-8 w-56" />
        <Block className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Block className="h-24 rounded-2xl" />
        <Block className="h-24 rounded-2xl" />
        <Block className="h-24 rounded-2xl" />
        <Block className="h-24 rounded-2xl" />
      </div>
      <Block className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className={`${pulse} space-y-6`} aria-busy="true" aria-live="polite">
      <Block className="h-9 w-48" />
      <Block className="h-4 w-2/3" />
      <Block className="h-48 w-full rounded-lg" />
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className={`${pulse} space-y-6`} aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between gap-4">
        <Block className="h-8 w-48" />
        <Block className="h-10 w-32 rounded-lg" />
      </div>
      <Block className="h-12 w-full rounded-lg" />
      <Block className="h-72 w-full rounded-lg" />
    </div>
  );
}
