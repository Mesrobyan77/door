import { notFound } from 'next/navigation';

import { ContactForm } from '@/features/contact/ui/ContactForm';
import { ContactInfo } from '@/features/contact/ui/ContactInfo';
import { getStorefrontBranding } from '@/features/settings';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

type ContactPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const dictionary = getDictionary(rawLocale);
  const branding = await getStorefrontBranding();

  return (
    <div className="space-y-7">
      <h1 className="section-heading">{dictionary.contact.title}</h1>
      <p className="text-sm text-gray-600">{dictionary.contact.subtitle}</p>
      <div className="rounded-lg border border-border bg-white p-5 sm:p-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <ContactInfo copy={dictionary.contact} phone={branding.phone} email={branding.email} />
          <ContactForm
            copy={{
              name: dictionary.contact.name,
              email: dictionary.contact.email,
              phone: dictionary.contact.phone,
              message: dictionary.contact.message,
              submit: dictionary.contact.submit,
              success: dictionary.contact.success,
              error: dictionary.contact.error,
            }}
          />
        </div>
      </div>
    </div>
  );
}
