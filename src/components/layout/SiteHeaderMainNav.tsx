import { AccountControls } from '@/components/layout/AccountControls';
import { Search } from 'lucide-react';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { HeaderNavLinks } from '@/components/layout/HeaderNavLinks';
import { LocaleCurrencySwitcher } from '@/components/layout/LocaleCurrencySwitcher';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import {
  SITE_HEADER_ACTIONS_RAIL,
  SITE_HEADER_INNER,
} from '@/components/layout/site-header-classes';
import { AppLink } from '@/components/ui/AppLink';
import { CartDrawer } from '@/features/cart/ui/CartDrawer';
import { WishlistHeaderLink } from '@/features/wishlist/ui/WishlistHeaderLink';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import type { Locale } from '@/lib/i18n/config';
import type { Currency } from '@/lib/money/currency';
import type { SessionUser } from '@/lib/auth/session';

type NavItem = {
  href: string;
  label: string;
};

type SiteHeaderMainNavProps = {
  locale: Locale;
  currency: Currency;
  dictionary: Dictionary;
  user: SessionUser | null;
  navItems: readonly NavItem[];
  cartItemCount: number;
  wishlistCount: number;
  logoUrl: string;
};

export function SiteHeaderMainNav({
  locale,
  currency,
  dictionary,
  user,
  navItems,
  cartItemCount,
  wishlistCount,
  logoUrl,
}: SiteHeaderMainNavProps) {
  return (
    <header className="relative z-40 border-b border-border/80 bg-background/95 shadow-[0_8px_30px_rgb(41_35_31/4%)] backdrop-blur-xl">
      <div className={SITE_HEADER_INNER}>
        <div className="flex min-h-[68px] flex-wrap items-center gap-3 py-2 sm:gap-4">
          <div className="flex w-full items-center justify-between md:w-auto md:justify-start md:gap-0">
            <AppLink
              href={`/${locale}`}
              prefetchPolicy="intent"
              className="text-lg font-semibold tracking-tight text-gray-900"
            >
              <BrandLogo src={logoUrl} />
            </AppLink>

            <div className="flex items-center gap-2 xl:hidden">
              <div>
                <LocaleCurrencySwitcher
                  locale={locale}
                  currency={currency}
                  currencyLabel={dictionary.header.currency}
                  languageLabel={dictionary.header.language}
                />
              </div>
              <MobileNavDrawer locale={locale} dictionary={dictionary} navItems={navItems} />
            </div>
          </div>

          <nav
            aria-label="Primary"
            className="order-3 hidden w-full items-center justify-center gap-2 xl:order-none xl:flex xl:w-auto xl:flex-1"
          >
            <HeaderNavLinks items={navItems} />
          </nav>

          <form
            action={`/${locale}/products`}
            method="get"
            role="search"
            className="relative flex min-w-0 flex-1 items-center md:max-w-[240px]"
          >
            <label htmlFor="header-search" className="sr-only">
              {dictionary.catalog.search}
            </label>
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder={dictionary.catalog.search}
              className="h-11 w-full border border-border bg-white px-3 pr-11 text-sm"
            />
            <button
              type="submit"
              aria-label={dictionary.catalog.search}
              className="absolute right-0 flex h-11 w-11 items-center justify-center"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <div className={`${SITE_HEADER_ACTIONS_RAIL} ml-auto hidden justify-end gap-1 xl:flex`}>
            <LocaleCurrencySwitcher
              locale={locale}
              currency={currency}
              currencyLabel={dictionary.header.currency}
              languageLabel={dictionary.header.language}
            />
            <AccountControls
              locale={locale}
              loginLabel={dictionary.header.login}
              logoutLabel={dictionary.header.logout}
              profileLabel={dictionary.header.profile}
              adminLabel={dictionary.header.admin}
              user={user}
            />
            <WishlistHeaderLink
              locale={locale}
              label={dictionary.nav.wishlist}
              count={wishlistCount}
            />
            <CartDrawer
              locale={locale}
              currency={currency}
              dictionary={dictionary}
              itemCount={cartItemCount}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
