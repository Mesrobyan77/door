import Image from "next/image";

import {
  ABOUT_HERO_IMAGE,
} from "@/features/about/content/team-members";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type AboutHeroProps = {
  copy: Dictionary["about"];
};

export function AboutHero({ copy }: AboutHeroProps) {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="relative h-[400px] w-full overflow-hidden rounded-lg shadow-lg md:h-[500px] lg:h-[600px]">
          <Image
            src={ABOUT_HERO_IMAGE}
            alt={copy.heroImageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>

        <div className="space-y-6">
          <p className="text-sm font-semibold tracking-wider text-[#7CB342] uppercase md:text-base">
            {copy.eyebrow}
          </p>
          <h1 className="text-4xl leading-tight font-bold text-gray-900 md:text-5xl lg:text-6xl">
            {copy.title}
          </h1>
          <div className="space-y-4 text-base leading-relaxed text-gray-600 md:text-lg">
            {copy.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
