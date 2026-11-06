import { Mail, MapPin, Phone } from "lucide-react";

import { AppLink } from "@/components/ui/AppLink";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type SiteFooterProps = {
  dictionary: Dictionary;
  locale: Locale;
};

export function SiteFooter({ dictionary, locale }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="storefront-footer mt-auto hidden shrink-0 border-t border-gray-800 bg-black md:block">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">
              {dictionary.footer.shop}
            </h3>
            <p className="text-sm text-gray-300">{dictionary.footer.description}</p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">
              {dictionary.footer.quickLinks}
            </h4>
            <ul className="space-y-2">
              <li>
                <AppLink
                  href={`/${locale}/products`}
                  prefetchPolicy="intent"
                  className="text-sm text-gray-300 transition-colors hover:text-white"
                >
                  {dictionary.nav.products}
                </AppLink>
              </li>
              <li>
                <AppLink
                  href={`/${locale}/blog`}
                  prefetchPolicy="intent"
                  className="text-sm text-gray-300 transition-colors hover:text-white"
                >
                  {dictionary.nav.blog}
                </AppLink>
              </li>
              <li>
                <AppLink
                  href={`/${locale}/about`}
                  prefetchPolicy="intent"
                  className="text-sm text-gray-300 transition-colors hover:text-white"
                >
                  {dictionary.nav.about}
                </AppLink>
              </li>
              <li>
                <AppLink
                  href={`/${locale}/contact`}
                  prefetchPolicy="intent"
                  className="text-sm text-gray-300 transition-colors hover:text-white"
                >
                  {dictionary.nav.contact}
                </AppLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">
              {dictionary.footer.legal}
            </h4>
            <ul className="space-y-2">
              <li>
                <AppLink
                  href={`/${locale}/legal/privacy`}
                  prefetchPolicy="intent"
                  className="text-sm text-gray-300 transition-colors hover:text-white"
                >
                  {dictionary.footer.privacyPolicy}
                </AppLink>
              </li>
              <li>
                <AppLink
                  href={`/${locale}/legal/terms`}
                  prefetchPolicy="intent"
                  className="text-sm text-gray-300 transition-colors hover:text-white"
                >
                  {dictionary.footer.terms}
                </AppLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">
              {dictionary.footer.contactInfo}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                <span className="text-sm text-gray-300">
                  {dictionary.contact.storeAddress}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-5 w-5 shrink-0 text-gray-400" />
                <a
                  href={`tel:${dictionary.contact.storePhone}`}
                  className="text-sm text-gray-300 transition-colors hover:text-white"
                >
                  {dictionary.contact.storePhone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-5 w-5 shrink-0 text-gray-400" />
                <a
                  href={`mailto:${dictionary.contact.storeEmail}`}
                  className="text-sm text-gray-300 transition-colors hover:text-white"
                >
                  {dictionary.contact.storeEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8">
          <p className="text-center text-sm text-gray-300 md:text-left">
            {dictionary.footer.copyright.replace("{year}", String(year))}
          </p>
        </div>
      </div>
    </footer>
  );
}
