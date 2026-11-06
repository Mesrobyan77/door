"use client";

import { getImageProps } from "next/image";
import { useEffect, useState } from "react";

import { AppLink } from "@/components/ui/AppLink";
import type { StorefrontHeroSlide } from "@/features/hero/application/queries";

type HomeHeroProps = {
  slides: StorefrontHeroSlide[];
  fallbackTitle: string;
  fallbackSubtitle: string;
  fallbackCtaLabel: string;
  fallbackCtaHref: string;
};

function isInternalHref(href: string): boolean {
  return href.startsWith("/");
}

export function HomeHero({
  slides,
  fallbackTitle,
  fallbackSubtitle,
  fallbackCtaLabel,
  fallbackCtaHref,
}: HomeHeroProps) {
  const [index, setIndex] = useState(0);
  const hasSlides = slides.length > 0;
  const active = hasSlides ? slides[index] : null;

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  const title = active?.copy.title ?? fallbackTitle;
  const subtitle = active?.copy.subtitle ?? fallbackSubtitle;
  const ctaLabel = active?.copy.buttonLabel ?? fallbackCtaLabel;
  const ctaHref = active?.copy.buttonUrl ?? fallbackCtaHref;
  const desktopImage = active?.desktopImageUrl ?? active?.mobileImageUrl;
  const mobileImage = active?.mobileImageUrl ?? active?.desktopImageUrl;

  const desktopProps = desktopImage
    ? getImageProps({
        src: desktopImage,
        alt: title,
        fill: true,
        priority: true,
        sizes: "100vw",
        className: "absolute inset-0 h-full w-full object-cover",
      }).props
    : null;

  const mobileProps =
    mobileImage && mobileImage !== desktopImage
      ? getImageProps({
          src: mobileImage,
          alt: title,
          fill: true,
          priority: true,
          sizes: "100vw",
        }).props
      : null;

  return (
    <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-[560px] w-screen overflow-hidden sm:h-[500px] md:h-[600px] lg:h-[700px]">
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

      {desktopProps ? (
        <picture>
          {mobileProps?.srcSet ? (
            <source
              media="(max-width: 767px)"
              srcSet={mobileProps.srcSet}
              sizes={mobileProps.sizes}
            />
          ) : null}
          {/* Decorative LCP plane — title is in the overlay heading. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
          <img {...desktopProps} />
        </picture>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-400" />
      )}

      <div className="absolute inset-0 z-20 flex flex-col items-start justify-start px-4 pt-28 pb-16 pointer-events-none sm:justify-center sm:px-6 sm:pt-0 sm:pb-0 md:px-12 lg:px-20 xl:px-32">
        <div className="pointer-events-auto max-w-full rounded-2xl border border-white/5 bg-white/5 p-4 shadow-2xl backdrop-blur-md sm:max-w-2xl sm:p-6 md:p-10 lg:p-12">
          <h1 className="mb-4 text-3xl leading-tight font-bold text-gray-900 sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mb-5 text-base leading-relaxed text-gray-700 sm:mb-8 sm:text-lg md:text-xl">
              {subtitle}
            </p>
          ) : null}
          {isInternalHref(ctaHref) ? (
            <AppLink
              href={ctaHref}
              prefetchPolicy="intent"
              className="inline-flex rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-800 sm:px-10 sm:py-4 sm:text-lg"
            >
              {ctaLabel}
            </AppLink>
          ) : (
            <a
              href={ctaHref}
              className="inline-flex rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-800 sm:px-10 sm:py-4 sm:text-lg"
            >
              {ctaLabel}
            </a>
          )}
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${slideIndex + 1}`}
              aria-current={slideIndex === index}
              className={
                slideIndex === index
                  ? "h-2.5 w-8 rounded-full bg-white"
                  : "h-2.5 w-2.5 rounded-full bg-white/50"
              }
              onClick={() => setIndex(slideIndex)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
