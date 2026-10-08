"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * The address that has no sheet. One static 404.html answers every unknown
 * URL, so the path is only known in the browser: "—" in the static HTML.
 */
export function RequestedPath() {
  const path = useSyncExternalStore(
    noopSubscribe,
    () => decodeURI(window.location.pathname),
    () => null,
  );
  return <span className="pnf__path">{path ?? "—"}</span>;
}
