import { ArrowRight, ArrowUpRight, Mail, Phone } from 'lucide-react';

import { BrandLogo } from '@/components/layout/BrandLogo';
import { AppLink } from '@/components/ui/AppLink';
import type { StoreHomepage } from '@/features/settings/domain/store-settings';
import { getStorefrontBranding } from '@/features/settings';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/get-dictionary';

export async function SiteFooter({
  dictionary,
  locale,
  footerLinks = [],
}: {
  dictionary: Dictionary;
  locale: Locale;
  footerLinks?: StoreHomepage['footerLinks'];
}) {
  const branding = await getStorefrontBranding();
  const quickLinks = (
    footerLinks.length
      ? footerLinks
      : [
          { href: '/products', label: { [locale]: dictionary.nav.products } },
          { href: '/about', label: { [locale]: dictionary.nav.about } },
          { href: '/blog', label: { [locale]: dictionary.nav.blog } },
          { href: '/contact', label: { [locale]: dictionary.nav.contact } },
        ]
  ).filter((link) => !link.href.startsWith('/legal/'));
  const legalLinks = [
    { href: '/legal/privacy', label: dictionary.footer.privacyPolicy },
    { href: '/legal/terms', label: dictionary.footer.terms },
  ];

  return (
    <footer className="storefront-footer mt-auto pb-24 text-white md:pb-0">
      <div className="design-container footer-grid">
        <div className="footer-brand">
          <AppLink href={`/${locale}`} prefetchPolicy="intent" className="footer-logo-surface">
            <BrandLogo src={branding.logoUrl} lightSurface />
          </AppLink>
          {branding.socialLinks.length ? (
            <div className="footer-socials">
              {branding.socialLinks.map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                  <ArrowUpRight aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <nav className="footer-column" aria-label={dictionary.footer.quickLinks}>
          <h2>{dictionary.footer.quickLinks}</h2>
          {quickLinks.map((link) => (
            <AppLink key={link.href} href={`/${locale}${link.href}`} prefetchPolicy="intent">
              {link.label[locale] ?? link.label.hy}
              <ArrowRight aria-hidden="true" />
            </AppLink>
          ))}
        </nav>

        <nav className="footer-column" aria-label={dictionary.footer.legal}>
          <h2>{dictionary.footer.legal}</h2>
          {legalLinks.map((link) => (
            <AppLink key={link.href} href={`/${locale}${link.href}`} prefetchPolicy="intent">
              {link.label}
              <ArrowRight aria-hidden="true" />
            </AppLink>
          ))}
        </nav>

        <div className="footer-column footer-contact">
          <h2>{dictionary.footer.contactInfo}</h2>
          {branding.phone ? (
            <a href={`tel:${branding.phone}`}>
              <Phone aria-hidden="true" />
              {branding.phone}
            </a>
          ) : null}
          {branding.email ? (
            <a href={`mailto:${branding.email}`}>
              <Mail aria-hidden="true" />
              {branding.email}
            </a>
          ) : null}
        </div>
      </div>

      <div className="design-container footer-bottom">
        <span>© {new Date().getFullYear()} Hdoors</span>
        <span>{dictionary.brand}</span>
      </div>
    </footer>
  );
}
