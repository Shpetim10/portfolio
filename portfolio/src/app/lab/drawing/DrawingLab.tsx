"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { DrawingStats } from "@/components/drawing/engine";
import { GlyphLineDrawing, type DrawingAnchors } from "@/components/drawing/GlyphLineDrawing";
import type { DrawingData, DrawingGeometry, DrawingSize } from "@/components/drawing/model";
import { cx } from "@/components/ui/cx";
import { gsap } from "@/motion/gsap";

/** assets-src/vitruvian/config.json: the traced geometry plus the tracer's own settings. */
export type TracerConfig = DrawingGeometry & {
  crop: { left: number; top: number; size: number };
  exclude: { x: number; y: number; w: number; h: number }[];
  inkThreshold: number;
  geometryMaskPx: number;
  colsDesktop: number;
  colsMobile: number;
};

const SIZES: DrawingSize[] = ["desktop", "mobile"];
/** Seconds per sweep leg, 0 → 1 or back: slow enough to watch every phase. */
const SWEEP_SECONDS = 6;
const READOUT_MS = 500;
const SCAN = "/assets/lab/vitruvian-scan.webp";
const MARKS = [0, 0.25, 0.3, 0.45, 0.55, 0.95, 1];

type Readout = { fps: number; avg: number; max: number; active: number };
const IDLE: Readout = { fps: 0, avg: 0, max: 0, active: 0 };

const fixed = (value: number, digits = 3) => value.toFixed(digits);

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-hairline pt-3">
      <p className="font-mono text-micro text-dust uppercase">{label}</p>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 font-mono text-label uppercase">
      <input
        type="checkbox"
        className="size-4 accent-signal"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {children}
    </label>
  );
}

/** The configured construction, in the same normalised space as the drawing (viewBox 0 0 1 1, stretched). */
function ConfigOverlay({ config }: { config: TracerConfig }) {
  const { square, circle, navel } = config;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full overflow-visible fill-none stroke-coolant"
      data-testid="config-overlay"
    >
      <rect
        x={square.x}
        y={square.y}
        width={square.size}
        height={square.size}
        vectorEffect="non-scaling-stroke"
      />
      <ellipse cx={circle.cx} cy={circle.cy} rx={circle.r} ry={circle.r} vectorEffect="non-scaling-stroke" />
      {config.exclude.map((rect, i) => (
        <rect
          key={i}
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={rect.h}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path
        d={`M${navel.x - 0.02} ${navel.y}H${navel.x + 0.02}M${navel.x} ${navel.y - 0.02}V${navel.y + 0.02}`}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function DrawingLab({ data, config }: { data: DrawingData; config: TracerConfig }) {
  const [progress, setProgress] = useState(1);
  const [size, setSize] = useState<DrawingSize>("desktop");
  const [reduced, setReduced] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [scan, setScan] = useState(false);
  const [scanOpacity, setScanOpacity] = useState(0.6);
  const [overlay, setOverlay] = useState(false);
  const [showAnchors, setShowAnchors] = useState(false);
  const [anchors, setAnchors] = useState<DrawingAnchors | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [readout, setReadout] = useState<Readout>(IDLE);

  // Frame stats accumulate here and publish twice a second, so the readout doesn't re-render per frame.
  const window_ = useRef({ frames: 0, total: 0, max: 0, active: 0, since: 0 });
  const onFrame = useCallback((stats: DrawingStats) => {
    const w = window_.current;
    w.frames++;
    w.total += stats.ms;
    w.max = Math.max(w.max, stats.ms);
    w.active = stats.active;
  }, []);

  useEffect(() => {
    window_.current.since = performance.now();
    const id = setInterval(() => {
      const w = window_.current;
      const now = performance.now();
      const seconds = (now - w.since) / 1000;
      setReadout(
        w.frames ? { fps: w.frames / seconds, avg: w.total / w.frames, max: w.max, active: w.active } : IDLE,
      );
      window_.current = { frames: 0, total: 0, max: 0, active: 0, since: now };
    }, READOUT_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!sweeping) return;
    const proxy = { value: 0 };
    const tween = gsap.to(proxy, {
      value: 1,
      duration: SWEEP_SECONDS,
      ease: "none",
      repeat: -1,
      yoyo: true,
      onUpdate: () => setProgress(proxy.value),
    });
    return () => {
      tween.kill();
    };
  }, [sweeping]);

  const grid = data.grids[size];
  const track = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setPointer({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height });
  };

  return (
    <section aria-label="Drawing bench" className="layout-grid gap-y-12 pb-32">
      <figure className="col-span-full m-0 lg:col-span-8">
        <div
          className={cx("relative mx-auto", size === "mobile" ? "max-w-[21rem]" : "max-w-[48rem]")}
          onPointerMove={track}
          onPointerLeave={() => setPointer(null)}
          data-testid="drawing-stage"
        >
          <GlyphLineDrawing
            data={data}
            progress={progress}
            size={size}
            reducedMotion={reduced}
            onFrame={onFrame}
            onLayout={setAnchors}
          />
          {scan && (
            // eslint-disable-next-line @next/next/no-img-element -- a lab-only overlay, stretched exactly like the grid
            <img
              src={SCAN}
              alt=""
              className="pointer-events-none absolute inset-0 size-full mix-blend-screen"
              style={{ opacity: scanOpacity, objectFit: "fill" }}
              data-testid="scan-overlay"
            />
          )}
          {overlay && <ConfigOverlay config={config} />}
          {showAnchors && anchors && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0" data-testid="anchors">
              {Object.entries(anchors).map(([name, point]) => (
                <span
                  key={name}
                  className="absolute size-2 -translate-1/2 border border-coolant"
                  style={{ left: point.x, top: point.y }}
                  title={name}
                />
              ))}
            </div>
          )}
        </div>
        <figcaption className="mt-3 text-center font-mono text-micro text-dust uppercase">
          Vitruvian Man, traced in code · {grid.cols} × {grid.rows} cells · after Leonardo da Vinci, c. 1490
        </figcaption>
      </figure>

      <div className="col-span-full flex flex-col gap-6 lg:col-span-4">
        <Control label="Progress">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              aria-label="Drawing progress"
              className="w-full accent-signal"
              onChange={(event) => {
                setSweeping(false);
                setProgress(Number(event.target.value));
              }}
            />
            <output
              className="w-14 text-right font-mono text-label tabular-nums"
              data-testid="progress-value"
            >
              {fixed(progress)}
            </output>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Jump to phase">
            {MARKS.map((mark) => (
              <button
                key={mark}
                type="button"
                onClick={() => {
                  setSweeping(false);
                  setProgress(mark);
                }}
                className="h-8 border border-hairline px-2 font-mono text-micro tabular-nums hover:bg-gunmetal"
              >
                {mark.toFixed(2)}
              </button>
            ))}
          </div>
          <Toggle checked={sweeping} onChange={setSweeping}>
            Sweep 0 ↔ 1 ({SWEEP_SECONDS}s)
          </Toggle>
        </Control>

        <Control label="Grid">
          <div className="flex gap-2" role="group" aria-label="Grid size">
            {SIZES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={size === option}
                onClick={() => setSize(option)}
                className={cx(
                  "h-10 border border-hairline px-4 font-mono text-label uppercase",
                  size === option ? "bg-bone text-ink" : "text-bone hover:bg-gunmetal",
                )}
              >
                {option} {data.grids[option].cols}×{data.grids[option].rows}
              </button>
            ))}
          </div>
        </Control>

        <Control label="Motion">
          <Toggle checked={reduced} onChange={setReduced}>
            Reduced motion (static final state)
          </Toggle>
        </Control>

        <Control label="Alignment">
          <Toggle checked={scan} onChange={setScan}>
            Scan
          </Toggle>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={scanOpacity}
            aria-label="Scan opacity"
            className="w-full accent-signal"
            disabled={!scan}
            onChange={(event) => setScanOpacity(Number(event.target.value))}
          />
          <Toggle checked={overlay} onChange={setOverlay}>
            Configured square, circle, navel, excluded rects
          </Toggle>
          <Toggle checked={showAnchors} onChange={setShowAnchors}>
            Layout anchors
          </Toggle>
        </Control>

        <Control label="Readout">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-label uppercase tabular-nums">
            <dt className="text-dust">FPS</dt>
            <dd data-testid="fps">{readout.fps.toFixed(1)}</dd>
            <dt className="text-dust">Frame avg</dt>
            <dd data-testid="frame-avg">{readout.avg.toFixed(2)} ms</dd>
            <dt className="text-dust">Frame max</dt>
            <dd data-testid="frame-max">{readout.max.toFixed(2)} ms</dd>
            <dt className="text-dust">Fading cells</dt>
            <dd data-testid="active">{readout.active}</dd>
            <dt className="text-dust">Pointer</dt>
            <dd data-testid="pointer">{pointer ? `${fixed(pointer.x)} · ${fixed(pointer.y)}` : "—"}</dd>
          </dl>
          <p className="text-small text-dust">
            Point at Leonardo&apos;s lines on the scan and copy the readings into{" "}
            <code className="font-mono">config.json</code> (normalised to the crop), then re-trace.
          </p>
        </Control>
      </div>
    </section>
  );
}
