"use client";

import { useCallback, useState } from "react";

function isProductsTreePath(pathname: string, locale: string): boolean {
  const productsPath = `/${locale}/admin/products`;
  const categoriesPath = `/${locale}/admin/categories`;
  return (
    pathname === productsPath ||
    pathname.startsWith(`${productsPath}/`) ||
    pathname === categoriesPath ||
    pathname.startsWith(`${categoriesPath}/`)
  );
}

/**
 * Products nested nav visibility.
 * Auto-opens when entering products/categories routes; user can still toggle.
 */
export function useAdminProductsSubnavExpanded(
  pathname: string,
  locale: string,
): [boolean, () => void] {
  const onProductsTree = isProductsTreePath(pathname, locale);
  const [wasOnProductsTree, setWasOnProductsTree] = useState(onProductsTree);
  const [userCollapsed, setUserCollapsed] = useState(false);
  const [userOpened, setUserOpened] = useState(false);

  if (onProductsTree !== wasOnProductsTree) {
    setWasOnProductsTree(onProductsTree);
    if (onProductsTree) {
      setUserCollapsed(false);
    }
  }

  const expanded = onProductsTree ? !userCollapsed : userOpened;

  const toggle = useCallback(() => {
    if (onProductsTree) {
      setUserCollapsed((prev) => !prev);
      return;
    }
    setUserOpened((prev) => !prev);
  }, [onProductsTree]);

  return [expanded, toggle];
}
