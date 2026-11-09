import Image from 'next/image';
import { ArrowRight, BookOpen, Languages, Ruler, ClipboardCheck } from 'lucide-react';
import { AppLink } from '@/components/ui/AppLink';

export function HomeStory({
  about,
  benefits,
  imageUrl,
  ctaHref,
}: {
  about: { eyebrow: string; title: string; description: string; ctaLabel: string };
  benefits: Array<{ title: string; description: string }>;
  imageUrl: string | null;
  ctaHref: string;
}) {
  const icons = [BookOpen, Languages, Ruler, ClipboardCheck];
  const populatedDescriptions = benefits.map((item) => item.description.trim()).filter(Boolean);
  const descriptionsAreDistinct =
    populatedDescriptions.length === new Set(populatedDescriptions).size;
  return (
    <>
      <section className="home-about design-container">
        <div className="home-about-copy">
          <p>{about.eyebrow}</p>
          <h2>{about.title}</h2>
          <div className="home-about-rule" />
          <p className="home-about-description">{about.description}</p>
          <AppLink href={ctaHref} prefetchPolicy="intent" className="gold-button mt-7">
            {about.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </AppLink>
        </div>
        <div className="home-about-media">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 767px) 100vw, 52vw"
              className="object-cover"
            />
          ) : null}
          <span aria-hidden="true">H</span>
        </div>
      </section>
      <section className="home-benefits">
        <div className="design-container grid sm:grid-cols-2 lg:grid-cols-4">
          {benefits.slice(0, 4).map((benefit, index) => {
            const Icon = icons[index]!;
            return (
              <article key={benefit.title}>
                <span>0{index + 1}</span>
                <Icon className="h-7 w-7" strokeWidth={1.35} />
                <h3>{benefit.title}</h3>
                {descriptionsAreDistinct && benefit.description ? (
                  <p>{benefit.description}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
