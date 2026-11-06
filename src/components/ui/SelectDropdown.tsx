"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useHoldFlag } from "@/lib/react/use-hold-flag";

export const DROPDOWN_ANIMATION_MS = 280;

export type SelectDropdownOption = {
  label: string;
  value: string;
};

type SelectDropdownProps = {
  name?: string;
  ariaLabel: string;
  value: string;
  /** When set, shows an empty-value row at the top of the list. */
  allLabel?: string;
  options: ReadonlyArray<SelectDropdownOption>;
  className?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  /** Wait for close animation before calling onValueChange. Default true. */
  deferChange?: boolean;
  /** Size the trigger to the selected label instead of full width. */
  fitContent?: boolean;
};

export function SelectDropdown({
  name,
  ariaLabel,
  value,
  allLabel,
  options,
  className = "",
  disabled = false,
  onValueChange,
  deferChange = true,
  fitContent = false,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const elevated = useHoldFlag(open, DROPDOWN_ANIMATION_MS);
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingChangeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();

  const selectedLabel =
    options.find((option) => option.value === value)?.label ??
    allLabel ??
    value;

  useEffect(() => {
    return () => {
      if (pendingChangeRef.current) {
        clearTimeout(pendingChangeRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectValue(next: string): void {
    setOpen(false);
    if (!deferChange) {
      onValueChange(next);
      return;
    }
    if (pendingChangeRef.current) {
      clearTimeout(pendingChangeRef.current);
    }
    pendingChangeRef.current = setTimeout(() => {
      pendingChangeRef.current = null;
      onValueChange(next);
    }, DROPDOWN_ANIMATION_MS);
  }

  return (
    <div
      ref={rootRef}
      className={`relative ${elevated ? "z-50" : "z-0"} ${fitContent ? "w-fit max-w-full" : ""} ${className}`}
    >
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        disabled={disabled}
        className={`flex h-11 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 pr-3 text-left text-sm text-gray-900 shadow-sm outline-none transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50 ${
          fitContent ? "w-auto max-w-full" : "w-full"
        }`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={fitContent ? "whitespace-nowrap" : "min-w-0 truncate"}
        >
          {selectedLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <div
        className={`absolute top-[calc(100%+0.5rem)] left-0 z-[100] grid transition-[grid-template-rows,opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          fitContent ? "min-w-full w-max" : "w-full"
        } ${
          open
            ? "translate-y-0 grid-rows-[1fr] opacity-100"
            : "pointer-events-none -translate-y-1 grid-rows-[0fr] opacity-0"
        }`}
        style={{ transitionDuration: `${DROPDOWN_ANIMATION_MS}ms` }}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white py-2"
          >
            {allLabel !== undefined ? (
              <SelectDropdownOptionRow
                label={allLabel}
                selected={value === ""}
                onSelect={() => selectValue("")}
              />
            ) : null}
            {options.map((option) => (
              <SelectDropdownOptionRow
                key={option.value}
                label={option.label}
                selected={value === option.value}
                onSelect={() => selectValue(option.value)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type SelectDropdownOptionRowProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
};

export function SelectDropdownOptionRow({
  label,
  selected,
  onSelect,
}: SelectDropdownOptionRowProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
      onClick={onSelect}
    >
      <span
        className={
          selected
            ? "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-900 bg-gray-900 text-white"
            : "flex h-4 w-4 shrink-0 rounded border border-gray-300 bg-white"
        }
        aria-hidden
      >
        {selected ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
            <path
              d="M2.5 6.2 4.8 8.5 9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}
