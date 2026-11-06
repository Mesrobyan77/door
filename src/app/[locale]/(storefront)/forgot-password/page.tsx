import { notFound } from "next/navigation";

import { ForgotPasswordForm } from "@/features/auth/ui/ForgotPasswordForm";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type ForgotPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ForgotPasswordPage({
  params,
}: ForgotPasswordPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const dictionary = getDictionary(rawLocale);

  return (
    <section className="mx-auto max-w-lg px-0 py-2 sm:py-4">
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">
          {dictionary.auth.forgotPasswordTitle}
        </h1>
        <p className="mb-8 text-gray-600">
          {dictionary.auth.forgotPasswordSubtitle}
        </p>
        <ForgotPasswordForm locale={rawLocale} dictionary={dictionary.auth} />
      </div>
    </section>
  );
}
