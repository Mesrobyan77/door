import { FileText, ShieldCheck } from 'lucide-react';

import { AppLink } from '@/components/ui/AppLink';
import { getStorefrontBranding } from '@/features/settings';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/get-dictionary';

type LegalDocument = 'privacy' | 'terms';

export async function LegalDocumentPage({
  activeDocument,
  dictionary,
  locale,
}: {
  activeDocument: LegalDocument;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const branding = await getStorefrontBranding();
  const documents = [
    {
      id: 'privacy' as const,
      href: '/legal/privacy',
      label: dictionary.footer.privacyPolicy,
      icon: ShieldCheck,
    },
    {
      id: 'terms' as const,
      href: '/legal/terms',
      label: dictionary.footer.terms,
      icon: FileText,
    },
  ];
  const activeLabel =
    activeDocument === 'privacy' ? dictionary.footer.privacyPolicy : dictionary.footer.terms;
  const content = dictionary.legal[activeDocument];

  return (
    <article className="legal-page">
      <header className="legal-page-header">
        <p>Hdoors / {dictionary.footer.legal}</p>
        <h1>{activeLabel}</h1>
      </header>

      <div className="legal-layout">
        <nav aria-label={dictionary.footer.legal} className="legal-navigation">
          <h2>{dictionary.footer.legal}</h2>
          {documents.map((document) => {
            const Icon = document.icon;
            const isActive = document.id === activeDocument;
            return (
              <AppLink
                key={document.id}
                href={`/${locale}${document.href}`}
                prefetchPolicy="intent"
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'is-active' : undefined}
              >
                <Icon aria-hidden="true" />
                <span>{document.label}</span>
              </AppLink>
            );
          })}
        </nav>

        <section className="legal-document" aria-labelledby="legal-document-title">
          <div className="legal-document-meta" aria-label={dictionary.legal.labels.effectiveDate}>
            <span>
              {dictionary.legal.labels.version} {dictionary.legal.version}
            </span>
            <span>
              {dictionary.legal.labels.effectiveDate}: {dictionary.legal.effectiveDate}
            </span>
          </div>
          <h2 id="legal-document-title">{activeLabel}</h2>
          <p className="legal-document-intro">{content.intro}</p>

          <div className="legal-document-sections">
            {content.sections.map((section) => (
              <section key={section.title}>
                <h3>{section.title}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.items.length ? (
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <aside className="legal-contact">
            <h3>{dictionary.legal.labels.contact}</h3>
            <p>{branding.name}</p>
            {branding.email ? <a href={`mailto:${branding.email}`}>{branding.email}</a> : null}
            {branding.phone ? <a href={`tel:${branding.phone}`}>{branding.phone}</a> : null}
          </aside>
        </section>
      </div>
    </article>
  );
}
