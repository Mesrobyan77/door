import Image from 'next/image';
import { ArrowRight, DoorOpen } from 'lucide-react';
import { AppLink } from '@/components/ui/AppLink';

export function HomeCatalogLinks({
  title,
  items,
  viewLabel,
}: {
  title: string;
  items: Array<{ title: string; href: string; imageUrl: string | null; illustrative: boolean }>;
  viewLabel: string;
}) {
  return (
    <section className="home-collections design-container" aria-labelledby="collections-title">
      <div className="home-section-intro">
        <p>Hdoors / 02</p>
        <h2 id="collections-title">{title}</h2>
      </div>
      <div className="collection-stories">
        {items.slice(0, 2).map((item, index) => (
          <AppLink
            key={item.href}
            href={item.href}
            prefetchPolicy="intent"
            className={`collection-card collection-story group ${index % 2 ? 'collection-story-reverse' : ''}`}
          >
            <div className="collection-story-media">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 767px) 100vw, 58vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                />
              ) : null}
            </div>
            <div className="collection-story-copy">
              <span className="collection-number">0{index + 1}</span>
              <DoorOpen className="h-7 w-7 text-accent" strokeWidth={1.4} />
              <h3>{item.title}</h3>
              <span className="collection-link">
                {viewLabel}
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </AppLink>
        ))}
      </div>
      {items[2] ? (
        <AppLink
          href={items[2].href}
          prefetchPolicy="intent"
          className="collection-card collection-third group"
        >
          {items[2].imageUrl ? (
            <Image
              src={items[2].imageUrl}
              alt={items[2].title}
              fill
              sizes="100vw"
              className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
            />
          ) : null}
          <div className="collection-third-shade" />
          <div className="relative flex items-center justify-between gap-5 p-6 sm:p-9">
            <h3>{items[2].title}</h3>
            <span className="collection-link">
              {viewLabel}
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </AppLink>
      ) : null}
    </section>
  );
}
