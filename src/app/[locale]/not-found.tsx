'use client';
import { usePathname } from 'next/navigation';
import { DoorOpen } from 'lucide-react';
import { AppLink } from '@/components/ui/AppLink';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { isLocale } from '@/lib/i18n/config';

export default function NotFound() {
  const segment = usePathname().split('/')[1] ?? 'hy';
  const locale = isLocale(segment) ? segment : 'hy';
  const copy = getDictionary(locale);
  return (
    <section className="content-panel my-10 text-center">
      <DoorOpen className="mx-auto mb-5 h-12 w-12 text-accent" strokeWidth={1} />
      <p className="text-xs tracking-[.2em] text-gray-500">Hdoors · 404</p>
      <h1 className="mt-4 text-2xl font-semibold">{copy.design.notFound}</h1>
      <AppLink href={`/${locale}/products`} prefetchPolicy="intent" className="gold-button mt-6">
        {copy.nav.products}
      </AppLink>
    </section>
  );
}
