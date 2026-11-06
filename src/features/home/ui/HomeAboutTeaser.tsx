import { AppLink } from "@/components/ui/AppLink";

type HomeAboutTeaserProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

export function HomeAboutTeaser({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
}: HomeAboutTeaserProps) {
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold tracking-wider text-gray-500 uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold text-gray-900 md:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 md:text-lg">
          {description}
        </p>
        <AppLink
          href={ctaHref}
          prefetchPolicy="intent"
          className="mt-6 inline-flex rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          {ctaLabel}
        </AppLink>
      </div>
    </section>
  );
}
