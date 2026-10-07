"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Live `matchMedia` subscription. Re-renders when the query flips (e.g. the
 * OS reduced-motion toggle). Returns `serverValue` during SSR / prerender.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
