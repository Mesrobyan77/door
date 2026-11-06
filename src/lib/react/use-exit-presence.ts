"use client";

import { useCallback, useEffect, useState } from "react";

type ExitPresenceResult = {
  /** Whether the portal/content should stay mounted (including exit animation). */
  rendered: boolean;
  /** True while the exit animation is playing. */
  exiting: boolean;
  /** Unmount immediately (e.g. when the exit animation ends). */
  finishExit: () => void;
};

/**
 * Keeps content mounted through an exit animation when `open` becomes false.
 * Open transitions adjust state during render; the exit timeout runs in an effect.
 */
export function useExitPresence(
  open: boolean,
  exitMs: number,
): ExitPresenceResult {
  const [rendered, setRendered] = useState(open);
  const [exiting, setExiting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setExiting(false);
      setRendered(true);
    } else if (rendered) {
      setExiting(true);
    }
  }

  const finishExit = useCallback(() => {
    setRendered(false);
    setExiting(false);
  }, []);

  useEffect(() => {
    if (open || !exiting) return;

    const timer = window.setTimeout(() => {
      finishExit();
    }, exitMs);

    return () => window.clearTimeout(timer);
  }, [open, exiting, exitMs, finishExit]);

  return { rendered, exiting, finishExit };
}
