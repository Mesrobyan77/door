'use client';

import { Languages } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { SelectDropdown } from '@/components/ui/SelectDropdown';
import { useAdminDictionary } from '@/features/admin/ui/AdminI18nContext';
import { locales, type Locale } from '@/lib/i18n/config';

function replaceLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split('/');
  segments[1] = locale;
  return segments.join('/') || `/${locale}/admin`;
}

export function AdminLocaleSwitcher({
  collapsed = false,
  locale,
}: {
  collapsed?: boolean;
  locale: Locale;
}) {
  const dictionary = useAdminDictionary();
  const pathname = usePathname() ?? `/${locale}/admin`;
  const searchParams = useSearchParams();
  const router = useRouter();
  const options = locales.map((code) => ({
    label: dictionary.languages[code],
    value: code,
  }));

  function changeLocale(value: string): void {
    const nextLocale = value as Locale;
    const query = searchParams.toString();
    router.push(`${replaceLocale(pathname, nextLocale)}${query ? `?${query}` : ''}`);
  }

  if (collapsed) {
    return (
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        aria-label={dictionary.language}
        title={dictionary.language}
        onClick={() => changeLocale(locale === 'hy' ? 'en' : locale === 'en' ? 'ru' : 'hy')}
      >
        <Languages className="h-4 w-4" aria-hidden />
      </button>
    );
  }

  return (
    <div className="admin-language-switcher">
      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Languages className="h-4 w-4" aria-hidden />
        <span>{dictionary.language}</span>
      </div>
      <SelectDropdown
        ariaLabel={dictionary.language}
        value={locale}
        options={options}
        placement="top"
        deferChange={false}
        onValueChange={changeLocale}
      />
    </div>
  );
}
