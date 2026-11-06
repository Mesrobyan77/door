"use client";

import { useState } from "react";

/**
 * Freezes a value while closed so exit animations keep the last open content.
 * Updates during render when `open` is true.
 */
export function useOpenSnapshot<T>(open: boolean, value: T): T {
  const [snapshot, setSnapshot] = useState(value);

  if (open && !Object.is(snapshot, value)) {
    setSnapshot(value);
  }

  return open ? value : snapshot;
}
