"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type ReactNode,
  type TransitionEvent,
} from "react";
import { createPortal } from "react-dom";

import { useProfileMobileSheetDrag } from "@/features/profile/ui/use-profile-mobile-sheet-drag";
import { useIsClient } from "@/lib/react/use-is-client";
import { useLatestRef } from "@/lib/react/use-latest-ref";
import { useOpenSnapshot } from "@/lib/react/use-open-snapshot";

/** Must match `.animate-bottom-sheet-panel-*` duration in globals.css. */
export const PROFILE_MOBILE_TAB_SHEET_MS = 300;
const SHEET_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
const SHEET_HEIGHT_VH = 72;

type MotionPhase = "enter" | "idle" | "exit" | "exit-drag";

type ProfileMobileTabSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Called after the close motion finishes (and the portal unmounts). */
  onExited?: () => void;
  ariaLabel: string;
  children: ReactNode;
};

/**
 * MaMarie-style mobile profile tab sheet: ~72dvh bottom panel with drag handle.
 * Open/close share 300ms motion; swipe-down dismisses without a mid-close jump.
 */
export function ProfileMobileTabSheet({
  open,
  onClose,
  onExited,
  ariaLabel,
  children,
}: ProfileMobileTabSheetProps) {
  const mounted = useIsClient();
  const [rendered, setRendered] = useState(false);
  const [phase, setPhase] = useState<MotionPhase>("enter");
  const [prevOpen, setPrevOpen] = useState(open);
  const [isDragging, setIsDragging] = useState(false);
  const [dragBackdropOpacity, setDragBackdropOpacity] = useState<number | null>(
    null,
  );
  const displayChildren = useOpenSnapshot(open, children);
  const displayAriaLabel = useOpenSnapshot(open, ariaLabel);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const exitNotifiedRef = useRef(false);
  const onExitedRef = useLatestRef(onExited);
  const onCloseRef = useLatestRef(onClose);

  const finishExit = useCallback(() => {
    if (exitNotifiedRef.current) return;
    exitNotifiedRef.current = true;
    setRendered(false);
    setPhase("enter");
    setIsDragging(false);
    setDragBackdropOpacity(null);
    const panel = panelRef.current;
    if (panel) {
      panel.style.transition = "";
      panel.style.transform = "";
    }
    onExitedRef.current?.();
  }, [onExitedRef]);

  const handleDismissFromDrag = useCallback((releaseOffsetY: number) => {
    setIsDragging(false);
    setPhase("exit-drag");
    setDragBackdropOpacity(0);

    const panel = panelRef.current;
    if (panel) {
      panel.style.transition = "none";
      panel.style.transform = `translateY(${releaseOffsetY}px)`;
      void panel.getBoundingClientRect();
      panel.style.transition = `transform ${PROFILE_MOBILE_TAB_SHEET_MS}ms ${SHEET_EASING}`;
      panel.style.transform = "translateY(100%)";
    }

    onCloseRef.current();
  }, [onCloseRef]);

  const handleSnapBack = useCallback(() => {
    setIsDragging(false);
    setDragBackdropOpacity(null);
    // Stay in `idle` — do not re-run the enter keyframe.
  }, []);

  const handleOffsetChange = useCallback((offsetY: number) => {
    setIsDragging(offsetY > 0);
    setDragBackdropOpacity(
      offsetY > 0 ? Math.max(0, 1 - offsetY / 280) : null,
    );
  }, []);

  const dragEnabled = rendered && open && phase === "idle";
  const {
    headerPointerHandlers,
    scrollAreaPointerHandlers,
    panelPointerHandlers,
  } = useProfileMobileSheetDrag({
    enabled: dragEnabled,
    panelRef,
    scrollAreaRef,
    onDismiss: handleDismissFromDrag,
    onSnapBack: handleSnapBack,
    onOffsetChange: handleOffsetChange,
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setIsDragging(false);
      setDragBackdropOpacity(null);
      setPhase("enter");
      setRendered(true);
    } else if (rendered && phase !== "exit-drag") {
      setPhase("exit");
    }
  }

  useEffect(() => {
    if (open) {
      exitNotifiedRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel) {
      panel.style.transition = "";
      panel.style.transform = "";
    }
  }, [open]);

  useEffect(() => {
    if (open || !rendered) return;
    if (phase !== "exit" && phase !== "exit-drag") return;

    const timer = window.setTimeout(() => {
      finishExit();
    }, PROFILE_MOBILE_TAB_SHEET_MS);

    return () => window.clearTimeout(timer);
  }, [open, rendered, phase, finishExit]);

  useEffect(() => {
    if (!rendered || phase !== "enter") return;
    const timer = window.setTimeout(() => {
      setPhase((current) => (current === "enter" ? "idle" : current));
    }, PROFILE_MOBILE_TAB_SHEET_MS + 40);
    return () => window.clearTimeout(timer);
  }, [rendered, phase]);

  useEffect(() => {
    if (!rendered) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onCloseRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [rendered, onCloseRef]);

  function handlePanelAnimationEnd(
    event: AnimationEvent<HTMLDivElement>,
  ): void {
    if (event.target !== event.currentTarget) return;
    if (event.animationName.includes("bottom-sheet-panel-in")) {
      setPhase("idle");
      return;
    }
    if (event.animationName.includes("bottom-sheet-panel-out")) {
      finishExit();
    }
  }

  function handlePanelTransitionEnd(
    event: TransitionEvent<HTMLDivElement>,
  ): void {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform") return;
    if (phase !== "exit-drag") return;
    finishExit();
  }

  if (!mounted || !rendered) return null;

  const backdropClass =
    phase === "enter"
      ? "animate-sheet-backdrop-in"
      : phase === "exit"
        ? "animate-sheet-backdrop-out"
        : "";

  const panelClass =
    phase === "enter"
      ? "animate-bottom-sheet-panel-in"
      : phase === "exit"
        ? "animate-bottom-sheet-panel-out"
        : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end overscroll-none lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={displayAriaLabel}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className={`absolute inset-0 rounded-none bg-black/35 backdrop-blur-[1px] ${backdropClass}`}
        style={
          dragBackdropOpacity === null
            ? phase === "exit-drag"
              ? {
                  opacity: 0,
                  transition: `opacity ${PROFILE_MOBILE_TAB_SHEET_MS}ms ${SHEET_EASING}`,
                }
              : undefined
            : {
                opacity: dragBackdropOpacity,
                transition: isDragging
                  ? "none"
                  : `opacity ${PROFILE_MOBILE_TAB_SHEET_MS}ms ${SHEET_EASING}`,
              }
        }
        onClick={() => onCloseRef.current()}
      />
      <div
        ref={panelRef}
        className={`relative z-[1] flex w-full flex-col overflow-hidden bg-white shadow-2xl ${panelClass}`}
        style={{
          height: `${SHEET_HEIGHT_VH}dvh`,
          borderTopLeftRadius: "var(--radius)",
          borderTopRightRadius: "var(--radius)",
        }}
        onClick={(event) => event.stopPropagation()}
        onAnimationEnd={handlePanelAnimationEnd}
        onTransitionEnd={handlePanelTransitionEnd}
        {...panelPointerHandlers}
      >
        <div
          className="flex h-12 shrink-0 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
          {...headerPointerHandlers}
        >
          <div
            className="rounded-full bg-gray-300"
            style={{ height: 6, width: 56 }}
            aria-hidden
          />
        </div>
        <div
          ref={scrollAreaRef}
          className={`profile-mobile-tab-sheet-scroll min-h-0 flex-1 overscroll-contain px-3 pt-1 ${
            isDragging || phase === "exit-drag"
              ? "touch-none overflow-hidden"
              : "overflow-y-auto"
          }`}
          {...scrollAreaPointerHandlers}
        >
          <div className="pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))]">
            {displayChildren}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
