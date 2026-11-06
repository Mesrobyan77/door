import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * Mirrors an external prop into local state, resetting when the prop identity changes.
 * Prefer this over syncing in an effect (avoids cascading renders).
 */
export function useSyncedState<T>(
  propValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(propValue);
  const [prevProp, setPrevProp] = useState(propValue);

  if (!Object.is(propValue, prevProp)) {
    setPrevProp(propValue);
    setState(propValue);
  }

  return [state, setState];
}
