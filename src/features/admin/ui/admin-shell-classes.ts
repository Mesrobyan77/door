/** Shared Tailwind classes: desktop admin sidebar flush to the viewport left edge. */
export const ADMIN_SIDEBAR_MOBILE_DRAWER_WRAP =
  "mb-6 shrink-0 px-4 pt-8 sm:px-6 lg:hidden lg:pt-0";

/** Width is set in `AdminSidebar` (expanded vs collapsed). */
export const ADMIN_SIDEBAR_ASIDE =
  "hidden lg:flex lg:h-full lg:shrink-0 lg:flex-col overflow-hidden rounded-r-[15px] border-r border-gray-200 bg-white transition-[width] duration-200 ease-out";

export const ADMIN_SIDEBAR_NAV =
  "flex min-h-0 flex-1 flex-col space-y-1 overflow-y-auto overscroll-y-contain px-2 py-6";

/** Desktop: viewport-height shell so only the main column scrolls; sidebar stays fixed. */
export const ADMIN_PAGE_SHELL =
  "flex min-h-screen flex-col bg-gray-50 lg:h-dvh lg:max-h-dvh lg:flex-row lg:overflow-hidden";

export const ADMIN_MAIN_COLUMN =
  "min-w-0 flex-1 px-4 pb-8 pt-12 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-contain lg:px-8";

export const ADMIN_MAIN_INNER = "w-full";
