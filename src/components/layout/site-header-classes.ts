/**
 * Shared rail for top-bar currency control + main-nav action icons
 * (profile, wishlist, cart) so they share the same right-edge column.
 * Width = 2×w-11 + cart (w-11 + px-1×2) + 2×gap-2.
 */
export const SITE_HEADER_ACTIONS_RAIL = 'flex shrink-0 items-center';

/** Match horizontal padding between top bar and main header. */
export const SITE_HEADER_INNER =
  'mx-auto w-[calc(100%_-_32px)] max-w-[1360px] sm:w-[calc(100%_-_48px)]';
