import { notFound } from 'next/navigation';

import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

type PrivacyPageProps = { params: Promise<{ locale: string }> };

/** Placeholder privacy page — publish blocked until approved copy (OPEN-014). */
export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);

  return (
    <article className="content-panel flex flex-col gap-5">
      <h1 className="section-heading">{dictionary.footer.privacyPolicy}</h1>
      <p className="text-[var(--muted)]">{dictionary.design.legalDraft}</p>
    </article>
  );
}
