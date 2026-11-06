"use client";

import Link from "next/link";

import { useAdminSidebarCollapse } from "@/features/admin/ui/AdminSidebarCollapseContext";

type AdminSidebarBrandProps = {
  locale: string;
};

export function AdminSidebarBrand({ locale }: AdminSidebarBrandProps) {
  const { collapsed, toggleCollapsed } = useAdminSidebarCollapse();

  return (
    <div
      className={`flex shrink-0 border-b border-gray-200 pb-3 pt-2 ${
        collapsed
          ? "flex-col items-center gap-2 px-1"
          : "items-center gap-1 px-2"
      }`}
    >
      {collapsed ? (
        <Link
          href={`/${locale}`}
          className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold text-gray-900 hover:bg-gray-50"
          title="White Shop home"
        >
          W
        </Link>
      ) : (
        <Link
          href={`/${locale}`}
          className="min-w-0 flex-1 rounded-md px-2 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          White Shop
        </Link>
      )}
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
