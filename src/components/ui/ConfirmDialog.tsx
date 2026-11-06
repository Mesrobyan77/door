"use client";

import {
  useEffect,
  useRef,
  type AnimationEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useExitPresence } from "@/lib/react/use-exit-presence";
import { useIsClient } from "@/lib/react/use-is-client";
import { useOpenSnapshot } from "@/lib/react/use-open-snapshot";

/** Keep mounted through exit keyframes (Mobee dialog out is 280ms; fallback 320ms). */
const CONFIRM_DIALOG_EXIT_MS = 320;

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Builds the standard destructive delete copy used across admin confirms. */
export function deleteConfirmDescription(
  entityLabel: string,
  name: string,
): string {
  return `Are you sure you want to delete the ${entityLabel} "${name}"? This action cannot be undone.`;
}

/**
 * Centered confirmation modal with Mobee-style keyframe open/close:
 * backdrop fade + panel rise/scale in, mirrored settle-out on dismiss.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const mounted = useIsClient();
  const { rendered, exiting, finishExit } = useExitPresence(
    open,
    CONFIRM_DIALOG_EXIT_MS,
  );
  const displayTitle = useOpenSnapshot(open, title);
  const displayDescription = useOpenSnapshot(open, description);
  const displayConfirmLabel = useOpenSnapshot(open, confirmLabel);
  const displayCancelLabel = useOpenSnapshot(open, cancelLabel);
  const onCloseRef = useRef(onClose);
  const isPendingRef = useRef(isPending);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    if (!rendered) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !isPendingRef.current) {
        onCloseRef.current();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [rendered]);

  function handlePanelAnimationEnd(
    event: AnimationEvent<HTMLDivElement>,
  ): void {
    if (event.target !== event.currentTarget) return;
    if (!event.animationName.includes("confirm-dialog-panel-out")) return;
    finishExit();
  }

  if (!mounted || !rendered) return null;

  const backdropClass = exiting
    ? "animate-confirm-dialog-backdrop-out"
    : "animate-confirm-dialog-backdrop-in";
  const panelClass = exiting
    ? "animate-confirm-dialog-panel-out"
    : "animate-confirm-dialog-panel-in";

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <button
        type="button"
        className={`absolute inset-0 cursor-pointer bg-black/40 disabled:cursor-not-allowed ${backdropClass}`}
        aria-label={displayCancelLabel}
        disabled={isPending}
        onClick={() => {
          if (!isPending) onClose();
        }}
      />
      <div
        className={`relative z-[1] w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:p-7 ${panelClass}`}
        onAnimationEnd={handlePanelAnimationEnd}
      >
        <h2
          id="confirm-dialog-title"
          className="text-xl font-semibold text-gray-900"
        >
          {displayTitle}
        </h2>
        <p
          id="confirm-dialog-description"
          className="mt-3 text-sm leading-relaxed text-gray-600"
        >
          {displayDescription}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {displayCancelLabel}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "…" : displayConfirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
