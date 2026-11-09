'use client';

import Image from 'next/image';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { AppLink } from '@/components/ui/AppLink';
import type { StorefrontHeroSlide } from '@/features/hero/application/queries';

const VIDEO_SRC = '/assets/video/hdoors-entrance-scroll.mp4';
const POSTER_SRC = '/assets/video/hdoors-entrance-poster.jpg';
const FINAL_FRAME_SRC = '/assets/video/hdoors-entrance-final.jpg';
const VIDEO_START_SECONDS = 0.04;
const VIDEO_END_GUARD_SECONDS = 0.12;

type Props = {
  slides: StorefrontHeroSlide[];
  fallbackTitle: string;
  fallbackSubtitle: string;
  fallbackCtaLabel: string;
  fallbackCtaHref: string;
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function HomeHero({
  slides,
  fallbackTitle,
  fallbackSubtitle,
  fallbackCtaLabel,
  fallbackCtaHref,
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const active = slides[0];
  const title = active?.copy.title ?? fallbackTitle;
  const subtitle = active?.copy.subtitle ?? fallbackSubtitle;
  const ctaHref = active?.copy.buttonUrl ?? fallbackCtaHref;

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    const copy = copyRef.current;
    if (!root || !video || !copy) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    let animationFrame = 0;
    let seekFrame = 0;
    let metadataReady = video.readyState >= HTMLMediaElement.HAVE_METADATA;
    let pendingTime: number | null = null;
    let copyHidden = false;

    const setCopyHidden = (hidden: boolean) => {
      if (copyHidden === hidden) return;
      copyHidden = hidden;
      copy.inert = hidden;
      copy.setAttribute('aria-hidden', String(hidden));
    };

    const seekToPendingTime = () => {
      if (!metadataReady || pendingTime === null || video.seeking || reducedMotion.matches) return;
      const target = pendingTime;
      pendingTime = null;
      if (Math.abs(video.currentTime - target) < 1 / 48) return;
      try {
        video.currentTime = target;
      } catch {
        pendingTime = target;
      }
    };

    const update = () => {
      animationFrame = 0;
      const headerOffset = header?.getBoundingClientRect().height ?? 0;
      root.style.setProperty('--entrance-header-offset', `${Math.round(headerOffset)}px`);

      if (reducedMotion.matches) {
        root.style.setProperty('--entrance-progress', '0');
        root.style.setProperty('--intro-fade', '0');
        root.style.setProperty('--showroom-reveal', '0');
        root.style.setProperty('--final-frame', '0');
        setCopyHidden(false);
        return;
      }

      const rect = root.getBoundingClientRect();
      const visibleHeight = Math.max(1, window.innerHeight - headerOffset);
      const travel = Math.max(1, root.offsetHeight - visibleHeight);
      const progress = clamp((headerOffset - rect.top) / travel);
      const introFade = clamp((progress - 0.08) / 0.28);
      const showroomReveal = clamp((progress - 0.78) / 0.22);

      root.style.setProperty('--entrance-progress', progress.toFixed(4));
      root.style.setProperty('--intro-fade', introFade.toFixed(4));
      root.style.setProperty('--showroom-reveal', showroomReveal.toFixed(4));
      root.style.setProperty('--final-frame', clamp((progress - 0.965) / 0.035).toFixed(4));
      setCopyHidden(introFade > 0.96);

      if (metadataReady && Number.isFinite(video.duration)) {
        const usableEnd = Math.max(VIDEO_START_SECONDS, video.duration - VIDEO_END_GUARD_SECONDS);
        pendingTime = VIDEO_START_SECONDS + progress * (usableEnd - VIDEO_START_SECONDS);
        seekToPendingTime();
      }
    };

    const requestUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(update);
    };
    const handleMetadata = () => {
      metadataReady = true;
      video.pause();
      requestUpdate();
    };
    const handleFrameReady = () => {
      video.removeAttribute('poster');
      root.setAttribute('data-video-ready', 'true');
    };
    const handleVideoError = () => {
      root.setAttribute('data-video-error', 'true');
      root.style.setProperty('--intro-fade', '0');
      setCopyHidden(false);
    };
    const handleSeeked = () => {
      video.removeAttribute('poster');
      root.setAttribute('data-video-ready', 'true');
      if (pendingTime !== null && !seekFrame) {
        seekFrame = window.requestAnimationFrame(() => {
          seekFrame = 0;
          seekToPendingTime();
        });
      }
    };

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('orientationchange', requestUpdate);
    window.addEventListener('pageshow', requestUpdate);
    reducedMotion.addEventListener('change', requestUpdate);
    video.addEventListener('loadedmetadata', handleMetadata);
    video.addEventListener('loadeddata', handleFrameReady);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleVideoError);
    const headerObserver = header ? new ResizeObserver(requestUpdate) : null;
    if (header && headerObserver) headerObserver.observe(header);

    if (metadataReady) handleMetadata();
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) handleFrameReady();

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (seekFrame) window.cancelAnimationFrame(seekFrame);
      headerObserver?.disconnect();
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      window.removeEventListener('orientationchange', requestUpdate);
      window.removeEventListener('pageshow', requestUpdate);
      reducedMotion.removeEventListener('change', requestUpdate);
      video.removeEventListener('loadedmetadata', handleMetadata);
      video.removeEventListener('loadeddata', handleFrameReady);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleVideoError);
    };
  }, []);

  return (
    <section ref={rootRef} className="home-hero entrance-sequence" aria-labelledby="entrance-title">
      <div className="entrance-stage">
        <div className="entrance-media" aria-hidden="true">
          <Image src={POSTER_SRC} alt="" fill priority sizes="100vw" className="entrance-poster" />
          <video
            ref={videoRef}
            className="entrance-video"
            src={VIDEO_SRC}
            poster={POSTER_SRC}
            preload="auto"
            muted
            playsInline
            tabIndex={-1}
          />
          <Image
            src={FINAL_FRAME_SRC}
            alt=""
            fill
            sizes="100vw"
            className="entrance-final-fallback"
          />
        </div>
        <div className="entrance-shade" aria-hidden="true" />
        <div ref={copyRef} className="entrance-copy design-container">
          <p className="entrance-eyebrow">Hdoors / 01</p>
          <h1 id="entrance-title">{title}</h1>
          <p>{subtitle}</p>
          <div className="entrance-actions">
            <AppLink href={ctaHref} prefetchPolicy="intent" className="gold-button">
              {active?.copy.buttonLabel ?? fallbackCtaLabel}
              <ArrowRight className="h-4 w-4" />
            </AppLink>
            <a href="#showroom" className="entrance-skip">
              {fallbackCtaLabel}
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="entrance-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}
