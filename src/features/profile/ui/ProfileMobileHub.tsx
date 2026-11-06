"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Package,
  Trash2,
  User,
} from "lucide-react";

import { AppLink } from "@/components/ui/AppLink";
import { logoutAction } from "@/features/auth/logout-action";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { SessionUser } from "@/lib/auth/session";

type ProfileMobileHubProps = {
  locale: Locale;
  user: SessionUser;
  dictionary: Dictionary["profile"];
  /** Opens the dashboard sheet while already on the profile hub route. */
  onOpenDashboard: () => void;
};

type MenuItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  danger?: boolean;
  iconTheme: "neutral" | "amber" | "sky";
};

const ICON_THEMES = {
  neutral: { bg: "bg-gray-100", fg: "text-gray-800" },
  amber: { bg: "bg-amber-50", fg: "text-amber-600" },
  sky: { bg: "bg-sky-50", fg: "text-sky-600" },
} as const;

/**
 * MaMarie-style mobile profile hub: header card + chevron menu + logout CTA.
 */
export function ProfileMobileHub({
  locale,
  user,
  dictionary,
  onOpenDashboard,
}: ProfileMobileHubProps) {
  const pathname = usePathname() ?? "";
  const logoutWithLocale = logoutAction.bind(null, locale);
  const displayName = `${user.firstName} ${user.lastName}`.trim();
  const hubHref = `/${locale}/profile`;

  const items: MenuItem[] = [
    {
      href: hubHref,
      label: dictionary.dashboard,
      icon: <LayoutDashboard className="h-5 w-5" />,
      exact: true,
      iconTheme: "neutral",
    },
    {
      href: `/${locale}/profile/orders`,
      label: dictionary.orders,
      icon: <Package className="h-5 w-5" />,
      iconTheme: "amber",
    },
    {
      href: `/${locale}/profile/personal-information`,
      label: dictionary.personal,
      icon: <User className="h-5 w-5" />,
      iconTheme: "sky",
    },
    {
      href: `/${locale}/profile/addresses`,
      label: dictionary.addresses,
      icon: <MapPin className="h-5 w-5" />,
      iconTheme: "neutral",
    },
    {
      href: `/${locale}/profile/password`,
      label: dictionary.password,
      icon: <Lock className="h-5 w-5" />,
      iconTheme: "amber",
    },
    {
      href: `/${locale}/profile/delete-account`,
      label: dictionary.deleteAccount,
      icon: <Trash2 className="h-5 w-5" />,
      danger: true,
      iconTheme: "sky",
    },
  ];

  const mainItems = items.filter((item) => !item.danger);
  const dangerItem = items.find((item) => item.danger);

  function isActive(item: MenuItem): boolean {
    if (item.exact) {
      return pathname === item.href || pathname === `${item.href}/`;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function renderRow(item: MenuItem): ReactNode {
    const theme = ICON_THEMES[item.iconTheme];
    const active = isActive(item);
    const content = (
      <>
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              item.danger ? "bg-red-50 text-red-500" : `${theme.bg} ${theme.fg}`
            }`}
          >
            {item.icon}
          </span>
          <span
            className={`truncate text-base font-medium ${
              item.danger ? "text-red-500" : "text-gray-800"
            }`}
          >
            {item.label}
          </span>
        </span>
        <ChevronRight
          className={`h-[18px] w-[18px] shrink-0 ${
            item.danger ? "text-red-400" : "text-gray-400 opacity-80"
          }`}
          aria-hidden
        />
      </>
    );

    if (item.exact) {
      return (
        <button
          key={item.href}
          type="button"
          onClick={onOpenDashboard}
          aria-current={active ? "page" : undefined}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-gray-50/80"
        >
          {content}
        </button>
      );
    }

    if (item.danger) {
      return (
        <div key={item.href} className="px-3 py-2">
          <AppLink
            href={item.href}
            prefetchPolicy="intent"
            className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-white px-3 py-3 text-left transition-colors hover:bg-red-50/60"
          >
            {content}
          </AppLink>
        </div>
      );
    }

    return (
      <AppLink
        key={item.href}
        href={item.href}
        prefetchPolicy="intent"
        aria-current={active ? "page" : undefined}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-gray-50/80"
      >
        {content}
      </AppLink>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <section
        className="rounded-[var(--radius)] bg-white px-4 py-5 shadow-sm ring-1 ring-gray-200/70"
        aria-label={dictionary.title}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-900 text-base font-semibold text-white shadow-[0_0_0_3px_white]">
            {user.firstName.slice(0, 1).toUpperCase()}
            {user.lastName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold leading-tight text-gray-900">
              {displayName}
            </p>
            <p className="truncate text-sm leading-snug text-gray-500">
              {user.email}
            </p>
            {user.phone ? (
              <p className="truncate text-sm leading-snug text-gray-500">
                {user.phone}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <nav
        className="overflow-hidden rounded-[var(--radius)] bg-white py-1 shadow-sm ring-1 ring-gray-200/70"
        aria-label={dictionary.title}
      >
        <div className="divide-y divide-gray-100">
          {mainItems.map((item) => renderRow(item))}
        </div>
        {dangerItem ? renderRow(dangerItem) : null}
      </nav>

      <form action={logoutWithLocale}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2.5 rounded-[var(--radius)] bg-gray-900 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden />
          {dictionary.logout}
        </button>
      </form>
    </div>
  );
}
