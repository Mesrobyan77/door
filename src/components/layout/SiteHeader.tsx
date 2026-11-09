import { Suspense } from 'react';

import { SiteHeaderMainNav } from '@/components/layout/SiteHeaderMainNav';
import { getCartItemCount } from '@/features/cart/cart';
import { getWishlistCount } from '@/features/wishlist/queries';
import { getCurrentUser } from '@/lib/auth/session';
import { getStorefrontBranding } from '@/features/settings';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import type { Locale } from '@/lib/i18n/config';
import type { Currency } from '@/lib/money/currency';

type SiteHeaderProps = {
  locale: Locale;
  currency: Currency;
  dictionary: Dictionary;
};

function HeaderControlsFallback() {
  return <div className="h-11 w-28 animate-pulse rounded-lg bg-gray-100" aria-hidden="true" />;
}

async function SiteHeaderMainNavAsync({ locale, currency, dictionary }: SiteHeaderProps) {
  const navItems = [
    { href: `/${locale}`, label: dictionary.nav.home },
    { href: `/${locale}/products`, label: dictionary.nav.products },
    { href: `/${locale}/about`, label: dictionary.nav.about },
    { href: `/${locale}/blog`, label: dictionary.nav.blog },
    { href: `/${locale}/contact`, label: dictionary.nav.contact },
  ] as const;

  const [user, cartItemCount, wishlistCount, branding] = await Promise.all([
    getCurrentUser(),
    getCartItemCount(),
    getWishlistCount(),
    getStorefrontBranding(),
  ]);

  return (
    <SiteHeaderMainNav
      locale={locale}
      currency={currency}
      dictionary={dictionary}
      user={user}
      navItems={navItems}
      cartItemCount={cartItemCount}
      wishlistCount={wishlistCount}
      logoUrl={branding.logoUrl}
    />
  );
}

/**
 * Storefront chrome: one coherent navigation surface. Account/cart/wishlist
 * load in a Suspense island so page content is not blocked.
 */
export function SiteHeader({ locale, currency, dictionary }: SiteHeaderProps) {
  return (
    <div className="site-header sticky top-0 z-[70] shrink-0" data-site-header>
      <Suspense
        fallback={
          <header className="relative z-10 border-b border-gray-200/80 bg-gradient-to-b from-gray-50 to-white shadow-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <span className="text-lg font-semibold tracking-tight text-gray-900">
                {dictionary.brand}
              </span>
              <HeaderControlsFallback />
            </div>
          </header>
        }
      >
        <SiteHeaderMainNavAsync locale={locale} currency={currency} dictionary={dictionary} />
      </Suspense>
    </div>
  );
}
