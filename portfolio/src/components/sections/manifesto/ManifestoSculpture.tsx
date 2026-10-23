"use client";

import { useEffect, useState } from "react";
import type { SculptureData, SculptureStill } from "@/components/sculpture/model";
import { SymbolSculpture } from "@/components/sculpture/SymbolSculpture";
import { useMediaQuery } from "@/motion/hooks/useMediaQuery";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { useManifestoProgress } from "./ManifestoStage";

/** How long the data may wait for an idle moment before it loads anyway (ms). */
const LOAD_TIMEOUT = 2000;

/**
 * Victory, driven by the manifesto's progress. Only this leaf re-renders as
 * the section scrolls.
 *
 * The server prints the final grid (`still`); the sampled data (~30 KB) loads
 * as its own chunk once the main thread is idle after hydration, so it never
 * delays the first paint or the hero. Reduced motion never needs it. Desktop
 * grid from lg, the lighter mobile grid below (same aspect: the box never moves).
 */
export function ManifestoSculpture({ still }: { still: SculptureStill }) {
  const progress = useManifestoProgress();
  const desktop = useMediaQuery("(width >= 64rem)", true);
  const reduced = useReducedMotion();
  const [data, setData] = useState<SculptureData | null>(null);

  useEffect(() => {
    if (reduced || data) return;
    let cancelled = false;
    const load = () =>
      import("@/content/sculpture/victory.json").then((module) => {
        if (!cancelled) setData(module.default as SculptureData);
      });
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: LOAD_TIMEOUT });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const id = window.setTimeout(load, 0); // Safari: no requestIdleCallback
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [reduced, data]);

  return (
    <SymbolSculpture
      data={data}
      still={still}
      progress={progress}
      size={desktop ? "desktop" : "mobile"}
      className="victory__sculpture"
    />
  );
}
