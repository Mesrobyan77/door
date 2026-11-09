import { notFound } from 'next/navigation';

import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

type PrivacyPageProps = { params: Promise<{ locale: string }> };

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);

  return <LegalDocumentPage activeDocument="privacy" dictionary={dictionary} locale={locale} />;
}
