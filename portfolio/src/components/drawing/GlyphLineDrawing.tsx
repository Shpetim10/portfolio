"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cx } from "@/components/ui/cx";
import { useDeviceTier } from "@/motion/hooks/useDeviceTier";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import type { DrawingEngine, DrawingStats } from "./engine";
import { layersOf } from "./grid";
import {
  anchorsOf,
  type DrawingAnchors,
  type DrawingData,
  type DrawingGeometry,
  type DrawingPoint,
  type DrawingSize,
} from "./model";

export type { DrawingAnchors };

export type GlyphLineDrawingProps = {
  data: DrawingData;
  /** 0 → 1: blank sheet → square → circle → figure → navel. The parent owns scrolling. */
  progress: number;
  size: DrawingSize;
  /** Anchor points for the parent's annotations; reported on mount and on every resize. */
  onLayout?: (anchors: DrawingAnchors) => void;
  className?: string;
  /** Forces the static final state (the lab's toggle). Can never switch motion on against the OS setting. */
  reducedMotion?: boolean;
  /** Lab instrumentation, called once per rendered frame. */
  onFrame?: (stats: DrawingStats) => void;
};

/* The drawing sequence (T09c): each part's share of progress. */
const SQUARE = [0, 0.3] as const;
const CIRCLE = [0.25, 0.55] as const;
const NAVEL = [0.95, 1] as const;

const span = (progress: number, [from, to]: readonly [number, number]) =>
  Math.min(1, Math.max(0, (progress - from) / (to - from)));

/**
 * Leonardo's construction as SVG paths, scaled by (sx, sy): the square from its
 * bottom-left corner, clockwise; each half of the circle from its bottom point
 * up to the top (right half, left half).
 */
function pathsOf({ square, circle }: DrawingGeometry, sx: number, sy: number) {
  const { x, y, size } = square;
  const { cx, cy, r } = circle;
  const bottom = `M${cx * sx} ${(cy + r) * sy}A${r * sx} ${r * sy} 0 0`;
  const top = `${cx * sx} ${(cy - r) * sy}`;
  return {
    square: `M${x * sx} ${(y + size) * sy}V${y * sy}H${(x + size) * sx}V${(y + size) * sy}Z`,
    right: `${bottom} 0 ${top}`,
    left: `${bottom} 1 ${top}`,
  };
}

/**
 * T09c · Leonardo's Vitruvian Man as a line drawing: the square and circle as
 * exact vector hairlines, the figure traced in code symbols that follow the
 * direction of his strokes, all driven by one `progress` value.
 *
 * Server-renders the FINAL state (the no-JS and reduced-motion state): the SVG
 * fully drawn and a <pre> with the final glyph grid. On the client a canvas of
 * the identical box takes over the glyphs; the <pre> stays in flow, hidden, so
 * the swap cannot shift layout. Decorative: every layer is aria-hidden and the
 * parent supplies the figcaption.
 *
 * The geometry lives in the image's normalised space (viewBox 0 0 1 1,
 * stretched to the box exactly as the glyph grid is), so the hairlines and the
 * glyphs can never drift apart.
 */
export function GlyphLineDrawing({
  data,
  progress,
  size,
  onLayout,
  className,
  reducedMotion,
  onFrame,
}: GlyphLineDrawingProps) {
  const reduced = useReducedMotion() || reducedMotion === true;
  const tier = useDeviceTier();
  const lowTier = tier === "low";
  // Low tier: the lighter grid. Same aspect, so the box barely moves.
  const gridSize: DrawingSize = lowTier ? "mobile" : size;
  const grid = data.grids[gridSize];
  const layers = useMemo(() => layersOf(grid), [grid]);
  const { circle, navel } = data.geometry;

  const rootRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DrawingEngine | null>(null);
  const progressRef = useRef(progress);
  const onFrameRef = useRef(onFrame);
  const onLayoutRef = useRef(onLayout);

  // Which engine has painted; the canvas only shows once it matches the current one.
  const engineKey = `${gridSize}:${lowTier}`;
  const [liveKey, setLiveKey] = useState<string | null>(null);
  /** The box in CSS px, once measured. */
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const live = !reduced && liveKey === engineKey;
  // Scrubbed only once the canvas has taken over; until then every layer shows the final state together.
  const p = live ? progress : 1;

  useEffect(() => {
    progressRef.current = progress;
    engineRef.current?.setProgress(progress);
  }, [progress]);

  useEffect(() => {
    onFrameRef.current = onFrame;
    onLayoutRef.current = onLayout;
  }, [onFrame, onLayout]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const anchors = anchorsOf(data.geometry);
    const observer = new ResizeObserver(() => {
      const { width, height } = root.getBoundingClientRect();
      setBox((prev) => (prev?.width === width && prev.height === height ? prev : { width, height }));
      const toPx = ({ x, y }: DrawingPoint) => ({ x: x * width, y: y * height });
      onLayoutRef.current?.({
        squareTopRight: toPx(anchors.squareTopRight),
        squareTopCenter: toPx(anchors.squareTopCenter),
        circleBottomLeft: toPx(anchors.circleBottomLeft),
        circleBottomCenter: toPx(anchors.circleBottomCenter),
        navel: toPx(anchors.navel),
      });
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [data.geometry]);

  useEffect(() => {
    // Tier unknown until the client has measured: hold the <pre> until then.
    if (reduced || tier === null) return;
    const root = rootRef.current;
    const pre = preRef.current;
    const canvas = canvasRef.current;
    if (!root || !pre || !canvas) return;

    // The engine is its own chunk: nothing about it is needed before the first paint.
    let engine: DrawingEngine | null = null;
    let cancelled = false;
    import("./engine").then(({ DrawingEngine }) => {
      if (cancelled) return;
      engine = new DrawingEngine({
        data,
        size: gridSize,
        lowTier,
        root,
        pre,
        canvas,
        progress: progressRef.current,
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

  const { cx: ccx, cy: ccy, r } = circle;
  /*
   * Until the box is measured (server, hydration), the hairlines are drawn in
   * normalised units with a non-scaling stroke: solid, the final state. Once
   * measured they are drawn in CSS px, where a 1-unit stroke is 1px and
   * pathLength="1" dashes work — Chrome measures dashes of a non-scaling
   * stroke in screen px and ignores pathLength, so the two can't be combined.
   */
  const scale = box ?? { width: 1, height: 1 };
  const paths = pathsOf(data.geometry, scale.width, scale.height);
  const stroke = (draw: number) =>
    box
      ? { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: draw }
      : { vectorEffect: "non-scaling-stroke" as const };
  const squareStroke = stroke(1 - span(p, SQUARE));
  const circleStroke = stroke(1 - span(p, CIRCLE));

  return (
    <div
      ref={rootRef}
      className={cx("drawing", className)}
      data-live={live || undefined}
      data-orbit={(live && p >= CIRCLE[1]) || undefined}
      style={
        {
          "--drawing-cols": grid.cols,
          "--drawing-rows": grid.rows,
          "--drawing-cell": data.cellRatio,
          "--drawing-cx": ccx,
          "--drawing-cy": ccy,
          "--drawing-r": r,
        } as CSSProperties
      }
    >
      <svg
        aria-hidden="true"
        className="drawing__geometry"
        viewBox={`0 0 ${scale.width} ${scale.height}`}
        preserveAspectRatio="none"
      >
        {/* One continuous line from the bottom-left corner, clockwise. */}
        <path d={paths.square} {...squareStroke} />
        {/* From the bottom point, both halves at once, meeting at the top. */}
        <path d={paths.right} {...circleStroke} />
        <path d={paths.left} {...circleStroke} />
      </svg>
      <pre ref={preRef} aria-hidden="true" className="drawing__pre">
        {layers.map((layer) => (
          <span key={layer.level} className="drawing__layer" style={{ opacity: layer.alpha }}>
            {layer.text}
          </span>
        ))}
      </pre>
      {!reduced && <canvas ref={canvasRef} aria-hidden="true" className="drawing__canvas" />}
      {!reduced && (
        <span aria-hidden="true" className="drawing__orbit">
          <span className="drawing__arm">
            <span className="drawing__compass" />
          </span>
        </span>
      )}
      <span
        aria-hidden="true"
        className="drawing__navel"
        style={{ left: `${navel.x * 100}%`, top: `${navel.y * 100}%`, opacity: span(p, NAVEL) }}
      />
    </div>
  );
}
