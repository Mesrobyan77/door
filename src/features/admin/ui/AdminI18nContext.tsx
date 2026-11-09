'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { Dictionary } from '@/lib/i18n/get-dictionary';

type AdminDictionary = Dictionary['admin'];

const AdminI18nContext = createContext<AdminDictionary | null>(null);

export function AdminI18nProvider({
  children,
  dictionary,
}: {
  children: ReactNode;
  dictionary: AdminDictionary;
}) {
  return <AdminI18nContext.Provider value={dictionary}>{children}</AdminI18nContext.Provider>;
}

export function useAdminDictionary(): AdminDictionary {
  const dictionary = useContext(AdminI18nContext);
  if (!dictionary) throw new Error('useAdminDictionary must be used inside AdminI18nProvider.');
  return dictionary;
}
