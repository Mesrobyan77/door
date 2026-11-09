import Image from 'next/image';
import { notFound } from 'next/navigation';
import { AppLink } from '@/components/ui/AppLink';
import { getStoreHomepage } from '@/features/settings';
import { listActiveHeroSlides } from '@/features/hero/application/queries';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  const [homepage, slides] = await Promise.all([getStoreHomepage(), listActiveHeroSlides(locale)]);
  const text = (value: Partial<Record<'hy' | 'en' | 'ru', string>>) =>
    value[locale] ?? value.hy ?? '';
  const image = slides[0]?.desktopImageUrl;
  return (
    <article className="space-y-10">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-xs tracking-[.2em] text-gray-500">Hdoors</p>
          <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {text(homepage.about.title) || dictionary.nav.about}
          </h1>
          <p className="mt-5 text-sm leading-7 text-gray-600">{text(homepage.about.description)}</p>
          <AppLink
            href={`/${locale}/products`}
            className="gold-button mt-7"
            prefetchPolicy="intent"
          >
            {dictionary.nav.products}
          </AppLink>
        </div>
        {image ? (
          <figure>
            <div className="relative h-80 overflow-hidden rounded-md bg-gray-100 sm:h-96">
              <Image
                src={image}
                alt={dictionary.design.hero.illustrative}
                fill
                sizes="(max-width: 1023px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </figure>
        ) : null}
      </div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {homepage.benefits.map((item) => (
          <div
            key={text(item.title)}
            className="rounded-md border border-border border-t-2 border-t-accent bg-white p-6"
          >
            <h2 className="font-semibold">{text(item.title)}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{text(item.description)}</p>
          </div>
        ))}
      </section>
    </article>
  );
}
