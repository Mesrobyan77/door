import { Mail, Phone, ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { AppLink } from '@/components/ui/AppLink';
import { getStorefrontBranding } from '@/features/settings';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import type { Locale } from '@/lib/i18n/config';
import type { StoreHomepage } from '@/features/settings/domain/store-settings';

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
  const links = footerLinks.length
    ? footerLinks
    : [
        { href: '/products', label: { [locale]: dictionary.nav.products } },
        { href: '/about', label: { [locale]: dictionary.nav.about } },
        { href: '/blog', label: { [locale]: dictionary.nav.blog } },
        { href: '/contact', label: { [locale]: dictionary.nav.contact } },
        { href: '/legal/privacy', label: { [locale]: dictionary.footer.privacyPolicy } },
        { href: '/legal/terms', label: { [locale]: dictionary.footer.terms } },
      ];
  return (
    <footer className="storefront-footer mt-auto border-t border-gray-800 pb-24 text-white md:pb-0">
      <div className="design-container flex flex-col gap-6 py-7 lg:flex-row lg:items-center lg:justify-between">
        <AppLink href={`/${locale}`} prefetchPolicy="intent" className="self-start">
          <BrandLogo src={branding.logoUrl} lightSurface />
        </AppLink>
        <nav
          aria-label={dictionary.footer.quickLinks}
          className="flex flex-wrap gap-x-6 gap-y-3 text-sm"
        >
          {links.map((link) => (
            <AppLink
              key={link.href}
              href={`/${locale}${link.href}`}
              prefetchPolicy="intent"
              className="text-white/80 transition hover:text-[#e0ba86]"
            >
              {link.label[locale] ?? link.label.hy}
            </AppLink>
          ))}
        </nav>
        <div className="flex flex-wrap gap-4 text-sm text-white/75">
          {branding.phone ? (
            <a href={`tel:${branding.phone}`} className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-accent" />
              {branding.phone}
            </a>
          ) : null}
          {branding.email ? (
            <a href={`mailto:${branding.email}`} className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent" />
              {branding.email}
            </a>
          ) : null}
          {branding.socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1"
            >
              {link.label}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          ))}
        </div>
      </div>
      <div className="design-container border-t border-white/10 py-4 text-xs text-white/60">
        © {new Date().getFullYear()} Hdoors
      </div>
    </footer>
  );
}
