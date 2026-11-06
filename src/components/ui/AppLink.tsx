import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Selective prefetch for storefront navigation (TECH_CARD + docs/06).
 *
 * - `intent` — header/footer/CTAs: full route + data as soon as eligible
 * - `auto` — Next default; with `loading.tsx`, dynamic routes get a partial shell prefetch in viewport
 * - `none` — disable viewport/hover prefetch (rare; prefer `auto` for catalogs)
 *
 * Prefetch runs in production only; `next dev` will not show the same latency win.
 */
export type AppLinkPrefetchPolicy = "intent" | "auto" | "none";

type AppLinkProps = Omit<ComponentProps<typeof Link>, "prefetch"> & {
  prefetchPolicy?: AppLinkPrefetchPolicy;
};

export function AppLink({
  prefetchPolicy = "auto",
  ...props
}: AppLinkProps) {
  if (prefetchPolicy === "intent") {
    return <Link {...props} prefetch />;
  }

  if (prefetchPolicy === "none") {
    return <Link {...props} prefetch={false} />;
  }

  return <Link {...props} prefetch="auto" />;
}
