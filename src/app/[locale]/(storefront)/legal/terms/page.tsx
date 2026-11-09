import { notFound } from 'next/navigation';

import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

type TermsPageProps = { params: Promise<{ locale: string }> };

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);

  return <LegalDocumentPage activeDocument="terms" dictionary={dictionary} locale={locale} />;
}
