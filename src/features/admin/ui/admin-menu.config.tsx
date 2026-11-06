import type { ReactNode } from "react";

export type AdminMenuItem = {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
  isSubCategory?: boolean;
  parentGroupId?: "products";
};

function MenuIcon({ d }: { d: string }) {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

/** Admin nav for capabilities that exist in this project (no brands/attributes). */
export function getAdminMenuItems(locale: string): AdminMenuItem[] {
  const base = `/${locale}/admin`;

  return [
    {
      id: "dashboard",
      label: "Dashboard",
      href: base,
      icon: (
        <MenuIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
    },
    {
      id: "orders",
      label: "Orders",
      href: `${base}/orders`,
      icon: (
        <MenuIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      ),
    },
    {
      id: "products",
      label: "Products",
      href: `${base}/products`,
      icon: (
        <MenuIcon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      ),
    },
    {
      id: "categories",
      label: "Categories",
      href: `${base}/categories`,
      isSubCategory: true,
      parentGroupId: "products",
      icon: (
        <MenuIcon d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      ),
    },
    {
      id: "delivery",
      label: "Delivery",
      href: `${base}/delivery`,
      icon: (
        <MenuIcon d="M8 17h8M8 17a2 2 0 11-4 0m4 0a2 2 0 104 0m8 0a2 2 0 11-4 0m4 0a2 2 0 104 0M3 9l1.5-4.5A2 2 0 016.4 3h7.2a2 2 0 011.9 1.5L17 9m-14 0h18m-18 0v6a2 2 0 002 2h1m15-8v6a2 2 0 01-2 2h-1" />
      ),
    },
    {
      id: "discounts",
      label: "Discounts",
      href: `${base}/discounts`,
      icon: (
        <MenuIcon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      id: "coupons",
      label: "Coupons",
      href: `${base}/coupons`,
      icon: (
        <MenuIcon d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      ),
    },
    {
      id: "users",
      label: "Users",
      href: `${base}/users`,
      icon: (
        <MenuIcon d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      ),
    },
    {
      id: "analytics",
      label: "Analytics",
      href: `${base}/analytics`,
      icon: (
        <MenuIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
    },
    {
      id: "hero",
      label: "Hero",
      href: `${base}/hero`,
      icon: (
        <MenuIcon d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      ),
    },
    {
      id: "blog",
      label: "Blog",
      href: `${base}/blog`,
      icon: (
        <MenuIcon d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      ),
    },
    {
      id: "messages",
      label: "Messages",
      href: `${base}/messages`,
      icon: (
        <MenuIcon d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      ),
    },
    {
      id: "settings",
      label: "Settings",
      href: `${base}/settings`,
      icon: <SettingsIcon />,
    },
  ];
}

export function isAdminTabActive(tabHref: string, pathname: string, locale: string): boolean {
  const dashboardHref = `/${locale}/admin`;
  if (tabHref === dashboardHref) {
    return pathname === dashboardHref || pathname === `${dashboardHref}/`;
  }
  return pathname === tabHref || pathname.startsWith(`${tabHref}/`);
}
