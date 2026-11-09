'use client';
import { usePathname } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { isLocale } from '@/lib/i18n/config';

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const segment = usePathname().split('/')[1] ?? 'hy';
  const copy = getDictionary(isLocale(segment) ? segment : 'hy');
  return (
    <section className="content-panel my-10 text-center">
      <p className="text-xs tracking-[.2em] text-gray-500">Hdoors</p>
      <h1 className="mt-4 text-2xl font-semibold">{copy.design.error}</h1>
      <button type="button" onClick={reset} className="gold-button mt-6">
        {copy.design.retry}
      </button>
    </section>
  );
}
