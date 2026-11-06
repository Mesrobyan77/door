"use client";

import type { ReactNode } from "react";

import { AdminSidebar } from "@/features/admin/ui/AdminSidebar";
import { AdminSidebarCollapseProvider } from "@/features/admin/ui/AdminSidebarCollapseContext";
import {
  ADMIN_MAIN_COLUMN,
  ADMIN_MAIN_INNER,
  ADMIN_PAGE_SHELL,
} from "@/features/admin/ui/admin-shell-classes";

type AdminShellProps = {
  locale: string;
  children: ReactNode;
};

export function AdminShell({ locale, children }: AdminShellProps) {
  return (
    <AdminSidebarCollapseProvider>
      <div className={ADMIN_PAGE_SHELL}>
        <AdminSidebar locale={locale} />
        <div className={ADMIN_MAIN_COLUMN}>
          <div className={ADMIN_MAIN_INNER}>{children}</div>
        </div>
      </div>
    </AdminSidebarCollapseProvider>
  );
}
