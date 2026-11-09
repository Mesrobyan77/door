import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
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
  const image = slides[0]?.desktopImageUrl ?? slides[0]?.mobileImageUrl;

  return (
    <article className="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="about-eyebrow">Hdoors / {dictionary.nav.about}</p>
          <h1>{text(homepage.about.title) || dictionary.nav.about}</h1>
          <div className="about-title-rule" aria-hidden="true" />
          <p className="about-lead">{text(homepage.about.description)}</p>
          <div className="about-actions">
            <AppLink href={`/${locale}/products`} className="gold-button" prefetchPolicy="intent">
              {dictionary.nav.products}
              <ArrowRight className="h-4 w-4" />
            </AppLink>
            <AppLink
              href={`/${locale}/contact`}
              className="about-secondary-link"
              prefetchPolicy="intent"
            >
              {dictionary.nav.contact}
              <ArrowRight className="h-4 w-4" />
            </AppLink>
          </div>
        </div>
        <figure className="about-hero-media">
          {image ? (
            <Image
              src={image}
              alt={dictionary.design.hero.illustrative}
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 58vw"
              className="object-cover"
            />
          ) : null}
          <figcaption>Hdoors</figcaption>
        </figure>
      </section>

      {homepage.benefits.length ? (
        <section className="about-benefits" aria-labelledby="about-benefits-title">
          <div className="about-benefits-intro">
            <p>Hdoors / 02</p>
            <h2 id="about-benefits-title">{text(homepage.about.title) || dictionary.nav.about}</h2>
          </div>
          <div className="about-benefits-grid">
            {homepage.benefits.map((item, index) => (
              <article key={`${text(item.title)}-${index}`}>
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <h3>{text(item.title)}</h3>
                <p>{text(item.description)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
