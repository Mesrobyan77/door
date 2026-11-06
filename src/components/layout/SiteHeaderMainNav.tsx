import { AccountControls } from "@/components/layout/AccountControls";
import { LocaleCurrencySwitcher } from "@/components/layout/LocaleCurrencySwitcher";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import {
  SITE_HEADER_ACTIONS_RAIL,
  SITE_HEADER_INNER,
} from "@/components/layout/site-header-classes";
import { AppLink } from "@/components/ui/AppLink";
import { CartDrawer } from "@/features/cart/ui/CartDrawer";
import { WishlistHeaderLink } from "@/features/wishlist/ui/WishlistHeaderLink";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { Currency } from "@/lib/money/currency";
import type { SessionUser } from "@/lib/auth/session";

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
};

function navLinkClassName(): string {
  return "rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900";
}

export function SiteHeaderMainNav({
  locale,
  currency,
  dictionary,
  user,
  navItems,
  cartItemCount,
  wishlistCount,
}: SiteHeaderMainNavProps) {
  return (
    <header className="relative z-40 border-b border-gray-200/80 bg-gradient-to-b from-gray-50 to-white shadow-sm backdrop-blur-sm">
      <div className={SITE_HEADER_INNER}>
        <div className="flex flex-wrap items-center gap-2 py-4 sm:gap-4 md:py-3">
          <div className="flex w-full items-center justify-between md:w-auto md:justify-start md:gap-0">
            <AppLink
              href={`/${locale}`}
              prefetchPolicy="intent"
              className="text-lg font-semibold tracking-tight text-gray-900"
            >
              {dictionary.brand}
            </AppLink>

          <div className="flex items-center gap-2 md:hidden">
            <LocaleCurrencySwitcher
              locale={locale}
              currency={currency}
              currencyLabel={dictionary.header.currency}
              languageLabel={dictionary.header.language}
            />
            <MobileNavDrawer
              locale={locale}
              dictionary={dictionary}
              navItems={navItems}
            />
          </div>
          </div>

          <nav
            aria-label="Primary"
            className="order-3 hidden w-full items-center justify-center gap-1 md:order-none md:flex md:flex-1"
          >
            {navItems.map((item) => (
              <AppLink
                key={item.href}
                href={item.href}
                prefetchPolicy="intent"
                className={navLinkClassName()}
              >
                {item.label}
              </AppLink>
            ))}
          </nav>

          <div
            className={`${SITE_HEADER_ACTIONS_RAIL} ml-auto hidden justify-center gap-2 md:flex`}
          >
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
