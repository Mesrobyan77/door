'use client';

import type { ReactNode } from 'react';

import { AdminSidebar } from '@/features/admin/ui/AdminSidebar';
import { AdminI18nProvider } from '@/features/admin/ui/AdminI18nContext';
import { AdminSidebarCollapseProvider } from '@/features/admin/ui/AdminSidebarCollapseContext';
import {
  ADMIN_MAIN_COLUMN,
  ADMIN_MAIN_INNER,
  ADMIN_PAGE_SHELL,
} from '@/features/admin/ui/admin-shell-classes';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import type { Locale } from '@/lib/i18n/config';

type AdminShellProps = {
  locale: Locale;
  dictionary: Dictionary['admin'];
  children: ReactNode;
};

export function AdminShell({ locale, dictionary, children }: AdminShellProps) {
  return (
    <AdminI18nProvider dictionary={dictionary}>
      <AdminSidebarCollapseProvider>
        <div lang={locale} className={`admin-shell ${ADMIN_PAGE_SHELL}`}>
          <AdminSidebar locale={locale} />
          <div className={ADMIN_MAIN_COLUMN}>
            <div className={ADMIN_MAIN_INNER}>{children}</div>
          </div>
        </div>
      </AdminSidebarCollapseProvider>
    </AdminI18nProvider>
  );
}
