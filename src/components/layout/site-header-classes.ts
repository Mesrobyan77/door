/**
 * Shared rail for top-bar currency control + main-nav action icons
 * (profile, wishlist, cart) so they share the same right-edge column.
 * Width = 2×w-11 + cart (w-11 + px-1×2) + 2×gap-2.
 */
export const SITE_HEADER_ACTIONS_RAIL =
  "flex w-[calc(2.75rem*2+3.25rem+0.5rem*2)] shrink-0 items-center";

/** Match horizontal padding between top bar and main header. */
export const SITE_HEADER_INNER =
  "mx-auto max-w-7xl px-2 sm:px-4 md:px-6 lg:px-8";
