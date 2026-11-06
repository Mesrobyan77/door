"use client";

import Link from "next/link";
import { useState } from "react";

import { SideSheet } from "@/components/ui/SideSheet";

import {
  getAdminMenuItems,
  isAdminTabActive,
  type AdminMenuItem,
} from "@/features/admin/ui/admin-menu.config";
import { useAdminProductsSubnavExpanded } from "@/features/admin/ui/useAdminProductsSubnavExpanded";

type AdminMenuDrawerProps = {
  locale: string;
  pathname: string;
};

function isNestedVisible(
  tab: AdminMenuItem,
  pathname: string,
  locale: string,
  productsNestedExpanded: boolean,
): boolean {
  if (tab.parentGroupId !== "products") return true;
  if (isAdminTabActive(tab.href, pathname, locale)) return true;
  return productsNestedExpanded;
}

export function AdminMenuDrawer({ locale, pathname }: AdminMenuDrawerProps) {
  const [open, setOpen] = useState(false);
  const tabs = getAdminMenuItems(locale);
  const [productsNestedExpanded, toggleProductsNested] =
    useAdminProductsSubnavExpanded(pathname, locale);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="admin-menu-drawer-panel"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-800 shadow-sm"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6H20M4 12H16M4 18H12"
          />
        </svg>
        Menu
      </button>

      <SideSheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Admin menu"
        side="left"
        panelClassName="w-1/2 min-w-[16rem] max-w-full"
      >
        <div
          id="admin-menu-drawer-panel"
          className="flex min-h-0 flex-1 flex-col"
        >
            <div className="border-b border-gray-200 px-4 py-4">
              <Link
                href={`/${locale}`}
                className="text-sm font-semibold text-gray-900"
                onClick={() => setOpen(false)}
              >
                White Shop
              </Link>
            </div>

            <nav className="flex-1 divide-y divide-gray-100 overflow-y-auto">
              {tabs.map((tab) => {
                if (
                  !isNestedVisible(
                    tab,
                    pathname,
                    locale,
                    productsNestedExpanded,
                  )
                ) {
                  return null;
                }

                const isActive = isAdminTabActive(tab.href, pathname, locale);

                if (tab.id === "products") {
                  return (
                    <div
                      key={tab.id}
                      className={`flex w-full ${isActive ? "bg-gray-900 text-white" : ""}`}
                    >
                      <Link
                        href={tab.href}
                        onClick={() => setOpen(false)}
                        className={`flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm font-medium ${
                          isActive
                            ? "text-white"
                            : "text-gray-700 hover:bg-gray-50"
                        } ${tab.isSubCategory ? "pl-10" : ""}`}
                      >
                        <span className="shrink-0">{tab.icon}</span>
                        <span className="truncate">{tab.label}</span>
                      </Link>
                      <button
                        type="button"
                        aria-expanded={productsNestedExpanded}
                        aria-label="Toggle product subpages"
                        onClick={toggleProductsNested}
                        className={`shrink-0 border-l px-3 py-3 ${
                          isActive
                            ? "border-white/25 text-white"
                            : "border-gray-200 text-gray-600"
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
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${
                      tab.isSubCategory ? "pl-10" : ""
                    } ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="shrink-0">{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
        </div>
      </SideSheet>
    </div>
  );
}
