"use client";

import { useEffect, useId, useRef, useState } from "react";

import { DROPDOWN_ANIMATION_MS } from "@/components/ui/SelectDropdown";
import { useHoldFlag } from "@/lib/react/use-hold-flag";

const HOVER_CLOSE_DELAY_MS = 140;

type IconDropdownProps = {
  label: string;
  trigger: React.ReactNode | ((open: boolean) => React.ReactNode);
  children: React.ReactNode;
  triggerClassName?: string;
  /** Where the menu opens relative to the trigger. Default: below. */
  menuPlacement?: "bottom" | "top";
  /** Open on pointer hover (click still toggles; needed for touch). */
  openOnHover?: boolean;
};

const DEFAULT_TRIGGER_CLASS =
  "inline-flex h-11 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 pr-3 text-gray-800 shadow-sm transition-colors hover:border-gray-300";

export function IconDropdown({
  label,
  trigger,
  children,
  triggerClassName,
  menuPlacement = "bottom",
  openOnHover = false,
}: IconDropdownProps) {
  const [open, setOpen] = useState(false);
  const elevated = useHoldFlag(open, DROPDOWN_ANIMATION_MS);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  function clearCloseTimer(): void {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu(): void {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose(): void {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  }

  useEffect(() => {
    return () => clearCloseTimer();
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

  const placementOpen =
    menuPlacement === "top"
      ? "bottom-full origin-bottom"
      : "top-full origin-top";
  const placementGap = menuPlacement === "top" ? "pb-2" : "pt-2";
  const placementClosedTransform =
    menuPlacement === "top" ? "translate-y-1" : "-translate-y-1";

  return (
    <div
      ref={rootRef}
      className={elevated ? "relative z-[210]" : "relative z-0"}
      onMouseEnter={openOnHover ? openMenu : undefined}
      onMouseLeave={openOnHover ? scheduleClose : undefined}
    >
      <button
        type="button"
        className={triggerClassName ?? DEFAULT_TRIGGER_CLASS}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {typeof trigger === "function" ? trigger(open) : trigger}
      </button>

      <div
        className={`absolute right-0 z-[220] grid w-max transition-[grid-template-rows,opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] ${placementOpen} ${placementGap} ${
          open
            ? "translate-y-0 grid-rows-[1fr] opacity-100"
            : `pointer-events-none grid-rows-[0fr] opacity-0 ${placementClosedTransform}`
        }`}
        style={{ transitionDuration: `${DROPDOWN_ANIMATION_MS}ms` }}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={menuId}
            role="menu"
            aria-label={label}
            className="w-full overflow-hidden rounded-2xl border border-gray-100 bg-white py-1"
          >
            <div
              className="flex w-full flex-col"
              onClick={(event) => {
                // Closing unmounts interactive children. Form submits (e.g. logout)
                // must finish first; the following redirect navigates away.
                const target = event.target;
                if (
                  target instanceof Element &&
                  target.closest("form, button[type='submit']")
                ) {
                  return;
                }
                setOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                  return;
                }
                const target = event.target;
                if (
                  target instanceof Element &&
                  target.closest("form, button[type='submit']")
                ) {
                  return;
                }
                setOpen(false);
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
