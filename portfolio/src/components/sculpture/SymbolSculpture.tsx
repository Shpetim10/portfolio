"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cx } from "@/components/ui/cx";
import { useDeviceTier } from "@/motion/hooks/useDeviceTier";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import type { SculptureEngine, SculptureStats } from "./engine";
import { layersOf, type SculptureData, type SculptureSize, type SculptureStill } from "./model";

export type SymbolSculptureProps = {
  /**
   * The sampled figure. `null` while it is still loading: the component then
   * prints `still` and stays static until the data arrives.
   */
  data: SculptureData | null;
  /** The final grid, precomputed (stillOf) — printed until `data` arrives. */
  still?: SculptureStill;
  /** 0 → 1: empty stage → assembled figure. The parent owns scrolling. */
  progress: number;
  size: SculptureSize;
  paused?: boolean;
  className?: string;
  /** Forces the static <pre> (the lab's toggle). Can never switch motion on against the OS setting. */
  reducedMotion?: boolean;
  /** Lab instrumentation, called once per rendered frame. */
  onFrame?: (stats: SculptureStats) => void;
};

/**
 * T04b · A sculpture drawn in code symbols, assembling in the wind as
 * `progress` goes 0 → 1: the torso forms first, the wings sweep in last.
 *
 * Server-renders the FINAL grid as a <pre> (the no-JS and reduced-motion
 * state). On the client a canvas of the identical box takes over; the <pre>
 * stays in flow, hidden, so the swap cannot shift layout. Decorative: both are
 * aria-hidden and the parent supplies the figcaption.
 *
 * A page can keep the sampled data off its critical path: render with
 * `data={null}` and a server-computed `still`, then pass the data once it has
 * loaded. Until then the <pre> shows the still and nothing animates.
 */
export function SymbolSculpture({
  data,
  still,
  progress,
  size,
  paused = false,
  className,
  reducedMotion,
  onFrame,
}: SymbolSculptureProps) {
  const reduced = useReducedMotion() || reducedMotion === true;
  const tier = useDeviceTier();
  const lowTier = tier === "low";
  // Low tier: the lighter grid. Same aspect, so the box doesn't move.
  const gridSize: SculptureSize = lowTier ? "mobile" : size;
  const grid = data?.grids[gridSize];
  const threshold = data?.threshold ?? 0;
  const layers = useMemo(
    () => (grid ? layersOf(grid, threshold) : (still?.layers ?? [])),
    [grid, threshold, still],
  );
  const box = grid
    ? { cols: grid.cols, rows: grid.rows, cellRatio: data!.cellRatio }
    : { cols: still?.cols ?? 1, rows: still?.rows ?? 1, cellRatio: still?.cellRatio ?? 1 };

  const rootRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SculptureEngine | null>(null);
  const progressRef = useRef(progress);
  const pausedRef = useRef(paused);
  const onFrameRef = useRef(onFrame);

  // Which engine has painted; the canvas only shows once it matches the current one.
  const engineKey = `${gridSize}:${lowTier}`;
  const [liveKey, setLiveKey] = useState<string | null>(null);
  const live = !reduced && data !== null && liveKey === engineKey;

  useEffect(() => {
    progressRef.current = progress;
    engineRef.current?.setProgress(progress);
  }, [progress]);

  useEffect(() => {
    pausedRef.current = paused;
    engineRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    // Tier unknown until the client has measured, or no data yet: hold the <pre> until then.
    if (reduced || tier === null || !data) return;
    const root = rootRef.current;
    const pre = preRef.current;
    const base = baseRef.current;
    const fx = fxRef.current;
    if (!root || !pre || !base || !fx) return;

    // The engine is its own chunk: nothing about it is needed before the first paint.
    let engine: SculptureEngine | null = null;
    let cancelled = false;
    import("./engine").then(({ SculptureEngine }) => {
      if (cancelled) return;
      engine = new SculptureEngine({
        data,
        size: gridSize,
        lowTier,
        root,
        pre,
        base,
        fx,
        progress: progressRef.current,
        paused: pausedRef.current,
        onReady: () => setLiveKey(engineKey),
        onFrame: (stats) => onFrameRef.current?.(stats),
      });
      engineRef.current = engine;
    });
    return () => {
      cancelled = true;
      engine?.destroy();
      engineRef.current = null;
    };
  }, [data, gridSize, lowTier, reduced, tier, engineKey]);

  return (
    <div
      ref={rootRef}
      className={cx("sculpture", className)}
      data-live={live || undefined}
      style={
        {
          "--sculpture-cols": box.cols,
          "--sculpture-rows": box.rows,
          "--sculpture-cell": box.cellRatio,
        } as CSSProperties
      }
    >
      <pre ref={preRef} aria-hidden="true" className="sculpture__pre">
        {layers.map((layer) => (
          <span key={layer.level} className="sculpture__layer" style={{ opacity: layer.alpha }}>
            {layer.text}
          </span>
        ))}
      </pre>
      {!reduced && data && (
        <>
          <canvas ref={baseRef} aria-hidden="true" className="sculpture__canvas" />
          <canvas ref={fxRef} aria-hidden="true" className="sculpture__canvas" />
        </>
      )}
    </div>
  );
}
