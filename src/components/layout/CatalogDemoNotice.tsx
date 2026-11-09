import type { StoreCatalogDemo } from '@/features/settings';
import type { Locale } from '@/lib/i18n/config';

type CatalogDemoNoticeProps = {
  locale: Locale;
  setting: StoreCatalogDemo;
};

export function CatalogDemoNotice({ locale, setting }: CatalogDemoNoticeProps) {
  if (!setting.enabled) return null;

  const message = setting.messages[locale] ?? setting.messages.hy;
  if (!message) return null;
  const attribution = setting.pexelsAttribution;

  return (
    <aside
      className="catalog-demo px-4 py-1.5 text-center leading-5"
      aria-label={message}
      data-catalog-demo-notice
    >
      <span>{message}</span>
      {attribution ? (
        <>
          {' '}
          <a
            className="font-medium underline underline-offset-2"
            href={attribution.url}
            rel="noreferrer"
            target="_blank"
          >
            {attribution.labels[locale] ?? attribution.labels.en ?? 'Pexels'}
          </a>
        </>
      ) : null}
    </aside>
  );
}
