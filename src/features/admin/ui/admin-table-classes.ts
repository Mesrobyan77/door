/**
 * Shared admin data-table visuals.
 * Use these for list tables in the admin sidebar area.
 */
export const ADMIN_TABLE_CARD = "overflow-hidden p-0";

/** Padding for loading / empty states inside a table card */
export const ADMIN_TABLE_STATE_INSET = "p-4 sm:p-5";

/** Wrapper when the table should not scroll horizontally. */
export const ADMIN_TABLE_OUTER_CLIP =
  "w-full min-w-0 overflow-hidden rounded-t-lg";

/** Wrapper with horizontal scroll for wide tables. */
export const ADMIN_TABLE_OUTER_SCROLL =
  "w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-t-lg";

export const ADMIN_TABLE =
  "w-full min-w-full table-auto border-collapse text-left text-sm";

export const ADMIN_TABLE_THEAD = "border-b border-gray-200 bg-gray-50";

export const ADMIN_TABLE_TH_CHECK =
  "w-px whitespace-nowrap px-2 py-2.5 text-center align-middle";

export const ADMIN_TABLE_TH =
  "min-w-0 whitespace-nowrap px-3 py-2.5 text-left align-middle text-[11px] font-semibold uppercase leading-snug tracking-wide text-gray-500 sm:text-xs";

export const ADMIN_TABLE_TH_CENTER =
  "min-w-0 whitespace-nowrap px-3 py-2.5 text-center align-middle text-[11px] font-semibold uppercase leading-snug tracking-wide text-gray-500 sm:text-xs";

export const ADMIN_TABLE_TBODY =
  "divide-y divide-gray-200 bg-white [&_td]:align-middle";

export const ADMIN_TABLE_ROW = "hover:bg-gray-50";

export const ADMIN_TABLE_TD_CHECK =
  "w-px whitespace-nowrap px-3 py-2.5 align-middle";

export const ADMIN_TABLE_TD = "min-w-0 px-3 py-2.5 align-middle text-sm";

export const ADMIN_TABLE_TD_CENTER =
  "min-w-0 px-3 py-2.5 align-middle text-center text-sm";

/** Equal-width centered metric columns (status / payment / total). */
export const ADMIN_TABLE_TH_METRIC =
  `${ADMIN_TABLE_TH_CENTER} w-40 min-w-40`;

export const ADMIN_TABLE_TD_METRIC =
  `${ADMIN_TABLE_TD_CENTER} w-40 min-w-40`;

export const ADMIN_TABLE_CHECKBOX = "h-4 w-4 shrink-0 rounded border-gray-300";

/** Footer row(s) below the table (pagination, bulk actions) */
export const ADMIN_TABLE_FOOTER = "border-t border-gray-200 px-4 py-3 sm:px-5";

export const ADMIN_TABLE_FOOTER_ROUNDED_B = `${ADMIN_TABLE_FOOTER} rounded-b-lg`;
