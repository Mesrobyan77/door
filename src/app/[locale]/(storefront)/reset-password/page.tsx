import { notFound } from "next/navigation";

import { ResetPasswordForm } from "@/features/auth/ui/ResetPasswordForm";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type ResetPasswordPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

function resolveToken(
  raw: string | string[] | undefined,
): string {
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string") {
    return raw[0];
  }
  return "";
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: ResetPasswordPageProps) {
  const { locale: rawLocale } = await params;
  const query = await searchParams;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const dictionary = getDictionary(rawLocale);
  const token = resolveToken(query.token);

  return (
    <section className="mx-auto max-w-lg px-0 py-2 sm:py-4">
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">
          {dictionary.auth.resetPasswordTitle}
        </h1>
        <p className="mb-8 text-gray-600">
          {dictionary.auth.resetPasswordSubtitle}
        </p>
        <ResetPasswordForm
          locale={rawLocale}
          token={token}
          dictionary={dictionary.auth}
        />
      </div>
    </section>
  );
}
