"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Package,
  Trash2,
  User,
} from "lucide-react";

import { AppLink } from "@/components/ui/AppLink";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type ProfileSidebarNavProps = {
  locale: Locale;
  dictionary: Dictionary["profile"];
  logoutAction: (formData: FormData) => void | Promise<void>;
};

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

function navClassName(active: boolean): string {
  const base =
    "flex w-full items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-left text-sm font-medium transition-colors";
  return active
    ? `${base} border-gray-900 bg-white/85 text-gray-900 shadow-sm`
    : `${base} border-transparent text-gray-600 hover:bg-white/50 hover:text-gray-900`;
}

export function ProfileSidebarNav({
  locale,
  dictionary,
  logoutAction,
}: ProfileSidebarNavProps) {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      href: `/${locale}/profile`,
      label: dictionary.dashboard,
      icon: <LayoutDashboard className="h-4 w-4" />,
      exact: true,
    },
    {
      href: `/${locale}/profile/orders`,
      label: dictionary.orders,
      icon: <Package className="h-4 w-4" />,
    },
    {
      href: `/${locale}/profile/personal-information`,
      label: dictionary.personal,
      icon: <User className="h-4 w-4" />,
    },
    {
      href: `/${locale}/profile/addresses`,
      label: dictionary.addresses,
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      href: `/${locale}/profile/password`,
      label: dictionary.password,
      icon: <Lock className="h-4 w-4" />,
    },
    {
      href: `/${locale}/profile/delete-account`,
      label: dictionary.deleteAccount,
      icon: <Trash2 className="h-4 w-4" />,
    },
  ];

  return (
    <div className="p-2 sm:p-3">
      <nav className="flex flex-col gap-0.5" aria-label={dictionary.title}>
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <AppLink
              key={item.href}
              href={item.href}
              prefetchPolicy="intent"
              className={navClassName(active)}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={
                  active
                    ? "flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-900 shadow-sm"
                    : "flex h-8 w-8 items-center justify-center rounded-md bg-gray-100/80 text-gray-500"
                }
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </AppLink>
          );
        })}
      </nav>

      <div className="mt-2 border-t border-gray-200/70 pt-2">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-500">
              <LogOut className="h-4 w-4" />
            </span>
            {dictionary.logout}
          </button>
        </form>
      </div>
    </div>
  );
}
