import { notFound } from "next/navigation";

import { ContactForm } from "@/features/contact/ui/ContactForm";
import { ContactInfo } from "@/features/contact/ui/ContactInfo";
import { ContactMap } from "@/features/contact/ui/ContactMap";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type ContactPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const dictionary = getDictionary(rawLocale);

  return (
    <div className="-mx-4 -my-10 bg-white sm:-mx-6 lg:-mx-8">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <ContactInfo copy={dictionary.contact} />
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
      <ContactMap title={dictionary.contact.mapTitle} />
    </div>
  );
}
