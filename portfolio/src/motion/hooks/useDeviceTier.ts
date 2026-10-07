"use client";

import { useSyncExternalStore } from "react";

/**
 * Coarse capability tier used to scale 3D and motion cost.
 *  - low:  data saver, 2G, ≤ 2 cores or ≤ 2 GB memory → static fallbacks
 *  - high: ≥ 8 cores and ≥ 8 GB memory (or unknown memory) on a fine pointer
 *  - mid:  everything else
 * `null` until the client has measured (SSR / prerender): defer heavy work.
 */
export type DeviceTier = "low" | "mid" | "high";

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

let cached: DeviceTier | undefined;

function measure(): DeviceTier {
  if (cached) return cached;
  const nav = navigator as NavigatorWithHints;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory; // Chromium only
  const connection = nav.connection;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  if (
    connection?.saveData ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g" ||
    cores <= 2 ||
    (memory !== undefined && memory <= 2)
  ) {
    cached = "low";
  } else if (cores >= 8 && (memory === undefined || memory >= 8) && finePointer) {
    cached = "high";
  } else {
    cached = "mid";
  }
  return cached;
}

const noopSubscribe = () => () => {};

export const useDeviceTier = (): DeviceTier | null =>
  useSyncExternalStore<DeviceTier | null>(noopSubscribe, measure, () => null);
