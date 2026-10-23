"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { SculptureStats } from "@/components/sculpture/engine";
import type { SculptureData, SculptureSize } from "@/components/sculpture/model";
import { SymbolSculpture } from "@/components/sculpture/SymbolSculpture";
import { cx } from "@/components/ui/cx";
import { gsap } from "@/motion/gsap";

const SIZES: SculptureSize[] = ["desktop", "mobile"];
/** Seconds per sweep leg, 0 → 1 or back: slow enough to watch the front travel. */
const SWEEP_SECONDS = 5;
const READOUT_MS = 500;

type Readout = { fps: number; avg: number; max: number; flights: number; releases: number };
const IDLE: Readout = { fps: 0, avg: 0, max: 0, flights: 0, releases: 0 };

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

export function SculptureLab({ data }: { data: SculptureData }) {
  const [progress, setProgress] = useState(1);
  const [size, setSize] = useState<SculptureSize>("desktop");
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [readout, setReadout] = useState<Readout>(IDLE);

  // Frame stats accumulate here and publish twice a second, so the readout doesn't re-render per frame.
  const window_ = useRef({ frames: 0, total: 0, max: 0, flights: 0, releases: 0, since: 0 });
  const onFrame = useCallback((stats: SculptureStats) => {
    const w = window_.current;
    w.frames++;
    w.total += stats.ms;
    w.max = Math.max(w.max, stats.ms);
    w.flights = stats.flights;
    w.releases = stats.releases;
  }, []);

  useEffect(() => {
    window_.current.since = performance.now();
    const id = setInterval(() => {
      const w = window_.current;
      const now = performance.now();
      const seconds = (now - w.since) / 1000;
      setReadout(
        w.frames
          ? {
              fps: w.frames / seconds,
              avg: w.total / w.frames,
              max: w.max,
              flights: w.flights,
              releases: w.releases,
            }
          : IDLE,
      );
      window_.current = { frames: 0, total: 0, max: 0, flights: 0, releases: 0, since: now };
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
    <section aria-label="Sculpture bench" className="layout-grid gap-y-12 pb-32">
      <figure className="col-span-full m-0 lg:col-span-8">
        <div
          className={cx("relative mx-auto", size === "mobile" ? "max-w-[21rem]" : "max-w-[48rem]")}
          onPointerMove={track}
          onPointerLeave={() => setPointer(null)}
          data-testid="sculpture-stage"
        >
          <SymbolSculpture
            data={data}
            progress={progress}
            size={size}
            paused={paused}
            reducedMotion={reduced}
            onFrame={onFrame}
          />
          {overlay && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              data-testid="core-overlay"
            >
              <span className="absolute inset-x-0 h-px bg-dust/60" style={{ top: `${data.core.y * 100}%` }} />
              <span
                className="absolute inset-y-0 w-px bg-dust/60"
                style={{ left: `${data.core.x * 100}%` }}
              />
              <span
                className="absolute size-2 -translate-1/2 bg-signal"
                style={{ left: `${data.core.x * 100}%`, top: `${data.core.y * 100}%` }}
              />
              <span
                className="absolute translate-x-3 translate-y-2 font-mono text-micro text-bone uppercase"
                style={{ left: `${data.core.x * 100}%`, top: `${data.core.y * 100}%` }}
              >
                Core {fixed(data.core.x, 2)} · {fixed(data.core.y, 2)}
              </span>
            </div>
          )}
        </div>
        <figcaption className="mt-3 text-center font-mono text-micro text-dust uppercase">
          Victory, rebuilt in code · {grid.cols} × {grid.rows} symbols · wind from {data.windFrom}
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
              aria-label="Assembly progress"
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
            Reduced motion (static &lt;pre&gt;)
          </Toggle>
          <Toggle checked={paused} onChange={setPaused}>
            Paused
          </Toggle>
          <Toggle checked={overlay} onChange={setOverlay}>
            Core-point overlay
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
            <dt className="text-dust">Flights</dt>
            <dd data-testid="flights">{readout.flights}</dd>
            <dt className="text-dust">Releases</dt>
            <dd data-testid="releases">{readout.releases}</dd>
            <dt className="text-dust">Pointer</dt>
            <dd data-testid="pointer">{pointer ? `${fixed(pointer.x)} · ${fixed(pointer.y)}` : "—"}</dd>
          </dl>
          <p className="text-small text-dust">
            Point at the torso centre, copy the pointer reading into <code className="font-mono">core</code>,
            then re-sample.
          </p>
        </Control>
      </div>
    </section>
  );
}
