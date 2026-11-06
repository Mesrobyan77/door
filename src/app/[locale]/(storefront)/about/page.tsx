import { notFound } from "next/navigation";

import { AboutHero } from "@/features/about/ui/AboutHero";
import { AboutTeam } from "@/features/about/ui/AboutTeam";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const dictionary = getDictionary(rawLocale);

  return (
    <div className="-mx-4 -my-10 bg-white sm:-mx-6 lg:-mx-8">
      <AboutHero copy={dictionary.about} />
      <AboutTeam copy={dictionary.about} />
    </div>
  );
}
