"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Keeps a ref pointing at the latest value without writing to the ref during render.
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
