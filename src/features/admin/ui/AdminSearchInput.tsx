"use client";

import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

/** Shared admin search field with leading magnifying-glass icon. */
export const ADMIN_SEARCH_INPUT =
  "h-11 w-full rounded-2xl border border-gray-200 bg-white py-0 pr-4 pl-10 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-gray-300";

type AdminSearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  wrapperClassName?: string;
  inputClassName?: string;
};

export function AdminSearchInput({
  wrapperClassName = "",
  inputClassName = "",
  className,
  ...props
}: AdminSearchInputProps) {
  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <input
        type="search"
        {...props}
        className={`${ADMIN_SEARCH_INPUT} ${inputClassName} ${className ?? ""}`.trim()}
      />
    </div>
  );
}
