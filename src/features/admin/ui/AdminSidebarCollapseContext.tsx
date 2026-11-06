"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminSidebarCollapseContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const AdminSidebarCollapseContext =
  createContext<AdminSidebarCollapseContextValue | null>(null);

export function AdminSidebarCollapseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({ collapsed, toggleCollapsed }),
    [collapsed, toggleCollapsed],
  );

  return (
    <AdminSidebarCollapseContext.Provider value={value}>
      {children}
    </AdminSidebarCollapseContext.Provider>
  );
}

export function useAdminSidebarCollapse(): AdminSidebarCollapseContextValue {
  const ctx = useContext(AdminSidebarCollapseContext);
  if (!ctx) {
    throw new Error(
      "useAdminSidebarCollapse must be used within AdminSidebarCollapseProvider",
    );
  }
  return ctx;
}
