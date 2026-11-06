"use client";

import { useEffect, useState } from "react";

/**
 * Keeps a flag true while `active`, and for `holdMs` after `active` becomes false
 * (so exit transitions keep stacking context / portal mount).
 */
export function useHoldFlag(active: boolean, holdMs: number): boolean {
  const [held, setHeld] = useState(active);
  const [prevActive, setPrevActive] = useState(active);

  if (active !== prevActive) {
    setPrevActive(active);
    if (active) {
      setHeld(true);
    }
  }

  useEffect(() => {
    if (active) return;
    const timer = window.setTimeout(() => setHeld(false), holdMs);
    return () => window.clearTimeout(timer);
  }, [active, holdMs]);

  return held;
}
