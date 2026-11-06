"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getAdminMenuItems,
  isAdminTabActive,
  type AdminMenuItem,
} from "@/features/admin/ui/admin-menu.config";
import { AdminMenuDrawer } from "@/features/admin/ui/AdminMenuDrawer";
import { AdminSidebarBrand } from "@/features/admin/ui/AdminSidebarBrand";
import { useAdminSidebarCollapse } from "@/features/admin/ui/AdminSidebarCollapseContext";
import {
  ADMIN_SIDEBAR_ASIDE,
  ADMIN_SIDEBAR_MOBILE_DRAWER_WRAP,
  ADMIN_SIDEBAR_NAV,
} from "@/features/admin/ui/admin-shell-classes";
import { useAdminProductsSubnavExpanded } from "@/features/admin/ui/useAdminProductsSubnavExpanded";

type AdminSidebarProps = {
  locale: string;
};

function isNestedVisible(
  tab: AdminMenuItem,
  pathname: string,
  locale: string,
  collapsed: boolean,
  productsNestedExpanded: boolean,
): boolean {
  if (tab.parentGroupId !== "products") return true;
  if (collapsed) return true;
  if (isAdminTabActive(tab.href, pathname, locale)) return true;
  return productsNestedExpanded;
}

export function AdminSidebar({ locale }: AdminSidebarProps) {
  const pathname = usePathname() ?? `/${locale}/admin`;
  const tabs = getAdminMenuItems(locale);
  const { collapsed } = useAdminSidebarCollapse();
  const [productsNestedExpanded, toggleProductsNested] =
    useAdminProductsSubnavExpanded(pathname, locale);

  const asideWidthClass = collapsed ? "lg:w-16" : "lg:w-64";

  return (
    <>
      <div className={ADMIN_SIDEBAR_MOBILE_DRAWER_WRAP}>
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/${locale}`}
            className="min-w-0 shrink text-sm font-semibold text-gray-900"
          >
            White Shop
          </Link>
          <AdminMenuDrawer locale={locale} pathname={pathname} />
        </div>
      </div>
      <aside className={`${ADMIN_SIDEBAR_ASIDE} ${asideWidthClass}`}>
        <AdminSidebarBrand locale={locale} />
        <nav
          className={`${ADMIN_SIDEBAR_NAV} ${collapsed ? "px-1" : "px-2"}`}
        >
          {tabs.map((tab) => {
            if (
              !isNestedVisible(
                tab,
                pathname,
                locale,
                collapsed,
                productsNestedExpanded,
              )
            ) {
              return null;
            }

            const isActive = isAdminTabActive(tab.href, pathname, locale);
            const rowClasses = `flex w-full items-center rounded-md text-sm font-medium transition-all ${
              collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"
            } ${tab.isSubCategory && !collapsed ? "pl-12" : ""} ${
              isActive
                ? "bg-gray-900 text-white"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }`;

            if (tab.id === "products" && !collapsed) {
              return (
                <div
                  key={tab.id}
                  className={`flex w-full min-w-0 overflow-hidden rounded-md ${
                    isActive ? "bg-gray-900 text-white" : "bg-transparent"
                  }`}
                >
                  <Link
                    href={tab.href}
                    title={tab.label}
                    className={`flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-all ${
                      isActive
                        ? "text-white hover:bg-gray-800"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span
                      className={`shrink-0 ${isActive ? "text-white" : "text-gray-500"}`}
                    >
                      {tab.icon}
                    </span>
                    <span className="min-w-0 truncate">{tab.label}</span>
                  </Link>
                  <button
                    type="button"
                    aria-expanded={productsNestedExpanded}
                    aria-label="Toggle product subpages"
                    title="Toggle product subpages"
                    onClick={(event) => {
                      event.preventDefault();
                      toggleProductsNested();
                    }}
                    className={`shrink-0 border-l px-2 py-3 transition-colors ${
                      isActive
                        ? "border-white/25 text-white hover:bg-white/10"
                        : "border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <svg
                      className={`h-5 w-5 transition-transform ${productsNestedExpanded ? "" : "-rotate-90"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.href}
                title={tab.label}
                className={rowClasses}
              >
                <span
                  className={`shrink-0 ${isActive ? "text-white" : "text-gray-500"}`}
                >
                  {tab.icon}
                </span>
                {collapsed ? null : (
                  <span className="min-w-0 truncate">{tab.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
