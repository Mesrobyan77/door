import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";

type TermsPageProps = { params: Promise<{ locale: string }> };

/** Placeholder legal page — publish blocked until approved copy (OPEN-014). */
export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <article className="prose flex max-w-2xl flex-col gap-3">
      <h1 className="text-3xl font-semibold">Terms of Service</h1>
      <p className="text-[var(--muted)]">
        Draft placeholder. Approved legal copy must replace this before
        production launch (OPEN-014).
      </p>
    </article>
  );
}
