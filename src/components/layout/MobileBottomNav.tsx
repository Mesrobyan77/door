"use client";

import {
  Heart,
  Home,
  ShoppingBag,
  ShoppingCart,
  User,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { AppLink } from "@/components/ui/AppLink";
import { CartDrawer } from "@/features/cart/ui/CartDrawer";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { Currency } from "@/lib/money/currency";

type MobileBottomNavProps = {
  locale: Locale;
  currency: Currency;
  dictionary: Dictionary;
  cartItemCount: number;
  wishlistCount: number;
  isSignedIn: boolean;
};

type NavTab = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  badge?: number;
};

function isHomePath(pathname: string, locale: Locale): boolean {
  return pathname === `/${locale}` || pathname === `/${locale}/`;
}

function startsWithPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function tabClassName(active: boolean): string {
  return [
    "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors",
    active ? "text-gray-900" : "text-gray-500 hover:text-gray-800",
  ].join(" ");
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[9px] font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function LinkTab({
  tab,
  active,
}: {
  tab: NavTab;
  active: boolean;
}) {
  const Icon = tab.icon;

  return (
    <AppLink
      href={tab.href}
      prefetchPolicy="intent"
      aria-current={active ? "page" : undefined}
      className={tabClassName(active)}
    >
      <span className="relative inline-flex">
        <Icon
          className="h-5 w-5"
          strokeWidth={active ? 2.25 : 1.75}
          aria-hidden="true"
        />
        {tab.badge != null ? <NavBadge count={tab.badge} /> : null}
      </span>
      <span className="truncate">{tab.label}</span>
    </AppLink>
  );
}

export function MobileBottomNav({
  locale,
  currency,
  dictionary,
  cartItemCount,
  wishlistCount,
  isSignedIn,
}: MobileBottomNavProps) {
  const pathname = usePathname() ?? `/${locale}`;
  const profileHref = isSignedIn
    ? `/${locale}/profile`
    : `/${locale}/login`;

  const homeTab: NavTab = {
    id: "home",
    href: `/${locale}`,
    label: dictionary.nav.home,
    icon: Home,
    match: (path) => isHomePath(path, locale),
  };

  const shopTab: NavTab = {
    id: "shop",
    href: `/${locale}/products`,
    label: dictionary.nav.shop,
    icon: ShoppingBag,
    match: (path) => startsWithPath(path, `/${locale}/products`),
  };

  const wishlistTab: NavTab = {
    id: "wishlist",
    href: `/${locale}/wishlist`,
    label: dictionary.nav.wishlist,
    icon: Heart,
    match: (path) => startsWithPath(path, `/${locale}/wishlist`),
    badge: wishlistCount,
  };

  const profileTab: NavTab = {
    id: "profile",
    href: profileHref,
    label: dictionary.header.profile,
    icon: User,
    match: (path) =>
      startsWithPath(path, `/${locale}/profile`) ||
      startsWithPath(path, `/${locale}/login`),
  };

  return (
    <nav
      aria-label={dictionary.nav.navigation}
      data-mobile-bottom-nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-stretch">
        <LinkTab tab={homeTab} active={homeTab.match(pathname)} />
        <LinkTab tab={shopTab} active={shopTab.match(pathname)} />

        <CartDrawer
          locale={locale}
          currency={currency}
          dictionary={dictionary}
          itemCount={cartItemCount}
          renderTrigger={({
            open,
            badgeCount,
            label,
            openDrawer,
            prefetchDrawerView,
          }) => (
            <button
              type="button"
              onClick={openDrawer}
              onPointerEnter={prefetchDrawerView}
              onFocus={prefetchDrawerView}
              aria-label={label}
              aria-expanded={open}
              data-cart-fly-target
              className={tabClassName(open)}
            >
              <span className="relative inline-flex">
                <ShoppingCart
                  className="h-5 w-5"
                  strokeWidth={open ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                <NavBadge count={badgeCount} />
              </span>
              <span className="truncate">{label}</span>
            </button>
          )}
        />

        <LinkTab tab={wishlistTab} active={wishlistTab.match(pathname)} />
        <LinkTab tab={profileTab} active={profileTab.match(pathname)} />
      </div>
    </nav>
  );
}
