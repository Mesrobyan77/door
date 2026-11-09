import { Mail, Phone } from 'lucide-react';
import { LocaleCurrencySwitcher } from '@/components/layout/LocaleCurrencySwitcher';
import { getStorefrontBranding } from '@/features/settings';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import type { Locale } from '@/lib/i18n/config';
import type { Currency } from '@/lib/money/currency';

export async function SiteHeaderTopBar({
  locale,
  currency,
  dictionary,
}: {
  locale: Locale;
  currency: Currency;
  dictionary: Dictionary;
}) {
  const branding = await getStorefrontBranding();
  return (
    <div className="hidden bg-gray-900 text-white md:block">
      <div className="design-container flex min-h-8 items-center justify-between gap-6 text-xs">
        <div className="flex items-center gap-6">
          <span className="font-semibold tracking-[.18em]">{branding.name}</span>
          {branding.phone ? (
            <a href={`tel:${branding.phone}`} className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-accent" />
              {branding.phone}
            </a>
          ) : null}
          {branding.email ? (
            <a href={`mailto:${branding.email}`} className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-accent" />
              {branding.email}
            </a>
          ) : null}
        </div>
        <LocaleCurrencySwitcher
          locale={locale}
          currency={currency}
          currencyLabel={dictionary.header.currency}
          languageLabel={dictionary.header.language}
        />
      </div>
    </div>
  );
}
