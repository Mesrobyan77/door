import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { LoginForm } from '@/features/auth/ui/LoginForm';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

type LoginPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const dictionary = getDictionary(rawLocale);

  return (
    <section className="mx-auto max-w-lg px-0 py-2 sm:py-4">
      <div className="auth-panel">
        <p className="mb-5 text-xs font-semibold tracking-[.2em] text-gray-500">Hdoors</p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">
          {dictionary.auth.loginTitle}
        </h1>
        <p className="mb-8 text-gray-600">{dictionary.auth.loginSubtitle}</p>
        <Suspense fallback={<p className="text-sm text-gray-500">…</p>}>
          <LoginForm locale={rawLocale} dictionary={dictionary.auth} />
        </Suspense>
      </div>
    </section>
  );
}
