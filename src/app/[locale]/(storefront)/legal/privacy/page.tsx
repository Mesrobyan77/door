import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";

type PrivacyPageProps = { params: Promise<{ locale: string }> };

/** Placeholder privacy page — publish blocked until approved copy (OPEN-014). */
export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <article className="prose flex max-w-2xl flex-col gap-3">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="text-[var(--muted)]">
        Draft placeholder. Approved privacy/retention copy must replace this
        before production launch (OPEN-014).
      </p>
    </article>
  );
}
