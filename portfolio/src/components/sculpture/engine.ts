"use client";

import { cssDuration, cssEase, type Ease } from "@/motion/bezier";
import { gsap } from "@/motion/gsap";
import { frontNoise } from "@/motion/noise";
import {
  GLYPHS,
  bit,
  bucketsOf,
  decodeBytes,
  levelAlpha,
  levelOf,
  type SculptureData,
  type SculptureGrid,
  type SculptureSize,
} from "./model";

/*
 * T04b · The canvas side of SymbolSculpture. Plain TypeScript, no React: the
 * component owns one engine per (size, tier) and feeds it progress / paused.
 *
 * Two stacked canvases over the <pre>:
 *  - base: settled glyphs. Only dirty cells are cleared and redrawn.
 *  - fx:   glyphs in flight (arrivals, departures, wind releases). Each frame
 *          clears exactly the rects it drew the frame before.
 * Every glyph is a drawImage from a pre-rendered atlas (bone row + signal row),
 * with the cell's alpha as globalAlpha.
 *
 * Progress → cells: figure cells are sorted by their threshold t, so a progress
 * change only touches the cells whose t lies between the old and new value
 * (binary search), never the whole grid.
 *
 * The loop runs on the GSAP ticker (the site's single RAF), capped at 30 fps
 * (20 on low tier), and is detached entirely when off-screen or paused.
 */

/** Spec timings (T04b). The arrival / fade / release numbers are part of the brief, not UI tokens. */
const FLIGHT_MS = 450;
const FADE_MS = 200;
const RELEASE_MS = 1200;
/** A released cell stays empty this long, then fades back in (FADE_MS). */
const REFORM_MS = 600;

const RE_ROLL_PER_FRAME = 0.003;
const ORANGE_MAX = 4;
/** Share of landings at the front that flash signal, while fewer than ORANGE_MAX are lit. */
const ORANGE_CHANCE = 0.2;
/** Edge cells past this order (wingtips, trailing drapery) may release glyphs to the wind. */
const RELEASE_ORDER = 0.7;

const LIMITS: Record<SculptureSize, { flights: number; releases: number; releaseRate: number }> = {
  // releaseRate: spawns per second; × RELEASE_MS ≈ glyphs in flight, clipped by `releases`.
  desktop: { flights: 140, releases: 10, releaseRate: 6.5 },
  mobile: { flights: 40, releases: 3, releaseRate: 4 },
};

const DPR_MAX = 2;

const Mode = {
  Empty: 0,
  Settled: 1,
  FadeIn: 2,
  FadeOut: 3,
  /** A flight particle owns the cell; the base canvas leaves it empty. */
  Flight: 4,
  /** Glyph blown off by the wind; re-forms after REFORM_MS. */
  Released: 5,
} as const;
type Mode = (typeof Mode)[keyof typeof Mode];

const Kind = { Arrive: 0, Depart: 1, Release: 2 } as const;
type Kind = (typeof Kind)[keyof typeof Kind];

type Particle = {
  kind: Kind;
  /** Figure cell index (−1 once a release has let go of its cell). */
  cell: number;
  glyph: number;
  alpha: number;
  /** Positions in cell units (col, row). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Perpendicular sway at mid-flight, in rows. */
  bow: number;
  /** Alpha multiplier at the start / end of the flight. */
  a0: number;
  a1: number;
  start: number;
  duration: number;
};

type Rect = { x: number; y: number; w: number; h: number };

export type SculptureStats = {
  /** Main-thread ms spent on the frame. */
  ms: number;
  /** Arrivals + departures in flight. */
  flights: number;
  /** Wind releases in flight. */
  releases: number;
};

export type EngineOptions = {
  data: SculptureData;
  size: SculptureSize;
  lowTier: boolean;
  root: HTMLElement;
  pre: HTMLElement;
  base: HTMLCanvasElement;
  fx: HTMLCanvasElement;
  progress: number;
  paused: boolean;
  onReady: () => void;
  onFrame?: (stats: SculptureStats) => void;
};

/* Glyph ink, measured once per font family. ------------------------------- */

const rankings = new Map<string, number[]>();

/** GLYPHS indices sorted by ink coverage in `family`, sparse → dense. */
function rankGlyphs(family: string): number[] {
  const cached = rankings.get(family);
  if (cached) return cached;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.font = `${size * 0.75}px ${family}`;
  ctx.textBaseline = "alphabetic";
  const ink = [...GLYPHS].map((glyph) => {
    ctx.clearRect(0, 0, size, size);
    ctx.fillText(glyph, size * 0.1, size * 0.75);
    const pixels = ctx.getImageData(0, 0, size, size).data;
    let sum = 0;
    for (let i = 3; i < pixels.length; i += 4) sum += pixels[i];
    return sum;
  });
  const ranked = [...GLYPHS].map((_, i) => i).sort((a, b) => ink[a] - ink[b] || a - b);
  rankings.set(family, ranked);
  return ranked;
}

/* The engine. -------------------------------------------------------------- */

export class SculptureEngine {
  private readonly options: EngineOptions;
  private readonly grid: SculptureGrid;
  private readonly limits: (typeof LIMITS)[SculptureSize];
  private readonly frameMs: number;
  private readonly flightLimit: number;
  /** +1 when the wind blows left → right. */
  private readonly wind: number;
  private readonly settle: Ease;
  private readonly orangeMs: number;

  // Figure cells (index f), structure of arrays.
  private readonly count: number;
  private readonly cellCol: Uint16Array;
  private readonly cellRow: Uint16Array;
  private readonly cellLevel: Uint8Array;
  private readonly cellAlpha: Float32Array;
  private readonly cellGlyph: Uint8Array;
  /** The final grid's glyphs, which a snap restores. */
  private readonly finalGlyph: Uint8Array;
  private readonly mode: Uint8Array;
  private readonly vis: Float32Array;
  private readonly timer: Float64Array;
  private readonly orangeUntil: Float64Array;
  private readonly particleOf: (Particle | null)[];
  /** Figure cells sorted by threshold t, and the sorted thresholds. */
  private readonly byT: Uint16Array;
  private readonly sortedT: Float32Array;
  private readonly cellT: Float32Array;
  private readonly edges: Uint16Array;

  /** Cells needing per-frame work: fades, released timers, signal flashes. */
  private readonly animating: number[] = [];
  private readonly isAnimating: Uint8Array;
  private readonly particles: Particle[] = [];
  private readonly pool: Particle[] = [];
  private drawnRects: Rect[] = [];
  private nextRects: Rect[] = [];
  private flights = 0;
  private releases = 0;
  private oranges = 0;

  private buckets: number[][] = [];
  private atlas: HTMLCanvasElement | null = null;
  private baseCtx: CanvasRenderingContext2D | null = null;
  private fxCtx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private cellW = 0;
  private cellH = 0;
  private tileW = 0;
  private tileH = 0;
  private colX: Int32Array = new Int32Array(0);
  private rowY: Int32Array = new Int32Array(0);

  private progress: number;
  private shownProgress = 0;
  private paused: boolean;
  private visible = false;
  private ready = false;
  private destroyed = false;
  /** Progress moved while nobody was looking: jump to it instead of animating. */
  private stale = true;
  private running = false;
  private last = 0;

  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  constructor(options: EngineOptions) {
    this.options = options;
    const { data, size, lowTier } = options;
    this.grid = data.grids[size];
    this.limits = LIMITS[size];
    this.frameMs = 1000 / (lowTier ? 20 : 30);
    this.flightLimit = lowTier ? 0 : this.limits.flights;
    this.wind = data.windFrom === "left" ? 1 : -1;
    this.settle = cssEase("settle");
    this.orangeMs = cssDuration("small") * 1000;
    this.progress = clamp01(options.progress);
    this.paused = options.paused;

    const { cols, rows } = this.grid;
    const lum = decodeBytes(this.grid.lum);
    const mask = decodeBytes(this.grid.mask);
    const order = decodeBytes(this.grid.order);
    const lines = this.grid.text.split("\n");

    const figure: number[] = [];
    for (let i = 0; i < cols * rows; i++) if (bit(mask, i)) figure.push(i);
    this.count = figure.length;
    const n = this.count;
    this.cellCol = new Uint16Array(n);
    this.cellRow = new Uint16Array(n);
    this.cellLevel = new Uint8Array(n);
    this.cellAlpha = new Float32Array(n);
    this.cellGlyph = new Uint8Array(n);
    this.finalGlyph = new Uint8Array(n);
    this.cellT = new Float32Array(n);
    this.mode = new Uint8Array(n);
    this.vis = new Float32Array(n);
    this.timer = new Float64Array(n);
    this.orangeUntil = new Float64Array(n);
    this.isAnimating = new Uint8Array(n);
    this.particleOf = new Array<Particle | null>(n).fill(null);

    const edges: number[] = [];
    const isFigure = (col: number, row: number) =>
      col >= 0 && row >= 0 && col < cols && row < rows && bit(mask, row * cols + col);
    figure.forEach((i, f) => {
      const col = i % cols;
      const row = (i / cols) | 0;
      const level = levelOf(lum[i], data.threshold);
      this.cellCol[f] = col;
      this.cellRow[f] = row;
      this.cellLevel[f] = level;
      this.cellAlpha[f] = levelAlpha(level, data.threshold);
      // The final grid's glyph, so the last frame matches the server-rendered <pre>.
      this.finalGlyph[f] = Math.max(0, GLYPHS.indexOf(lines[row]?.[col] ?? "."));
      // Never exactly 0: progress 0 means an empty stage.
      this.cellT[f] = Math.max(1e-4, (order[i] / 255) * 0.85 + frontNoise(col, row, cols) * 0.15);
      const exposed =
        !isFigure(col - 1, row) ||
        !isFigure(col + 1, row) ||
        !isFigure(col, row - 1) ||
        !isFigure(col, row + 1);
      if (exposed && order[i] / 255 > RELEASE_ORDER) edges.push(f);
    });
    this.cellGlyph.set(this.finalGlyph);
    this.edges = Uint16Array.from(edges);
    this.byT = Uint16Array.from(figure.map((_, f) => f)).sort((a, b) => this.cellT[a] - this.cellT[b]);
    this.sortedT = Float32Array.from(this.byT, (f) => this.cellT[f]);

    void this.start();
  }

  /* Public API ------------------------------------------------------------- */

  setProgress(progress: number) {
    this.progress = clamp01(progress);
    if (!this.ready) return;
    if (!this.visible) this.stale = true;
    // Frozen: show the new state at once rather than letting it pile up for later.
    else if (this.paused) this.snap();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.updateLoop();
  }

  destroy() {
    this.destroyed = true;
    this.stop();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.baseCtx?.clearRect(0, 0, this.options.base.width, this.options.base.height);
    this.fxCtx?.clearRect(0, 0, this.options.fx.width, this.options.fx.height);
  }

  /* Setup ------------------------------------------------------------------ */

  private async start() {
    const { pre, root } = this.options;
    const style = getComputedStyle(pre);
    // Measure in the real face, never its metric-matched fallback.
    await document.fonts.load(`${style.fontSize} ${style.fontFamily}`).catch(() => []);
    if (this.destroyed) return;

    this.buckets = bucketsOf(rankGlyphs(style.fontFamily));
    this.baseCtx = this.options.base.getContext("2d");
    this.fxCtx = this.options.fx.getContext("2d");
    if (!this.baseCtx || !this.fxCtx) return;
    this.layout();
    this.snap();
    this.ready = true;
    this.options.onReady();

    this.resizeObserver = new ResizeObserver(() => {
      this.layout();
      this.redraw();
    });
    this.resizeObserver.observe(root);
    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        this.updateLoop();
      },
      { rootMargin: "10% 0px" },
    );
    this.intersectionObserver.observe(root);
  }

  /** Canvas size, cell metrics and the glyph atlas, from the <pre>'s actual box and font. */
  private layout() {
    const { pre, base, fx, root } = this.options;
    const { cols, rows } = this.grid;
    const box = pre.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const style = getComputedStyle(pre);
    const fontPx = parseFloat(style.fontSize);
    this.dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
    this.cellW = box.width / cols;
    this.cellH = box.height / rows;
    for (const canvas of [base, fx]) {
      canvas.width = Math.round(box.width * this.dpr);
      canvas.height = Math.round(box.height * this.dpr);
    }
    this.colX = Int32Array.from({ length: cols + 1 }, (_, c) => Math.round(c * this.cellW * this.dpr));
    this.rowY = Int32Array.from({ length: rows + 1 }, (_, r) => Math.round(r * this.cellH * this.dpr));
    this.tileW = Math.ceil(this.cellW * this.dpr);
    this.tileH = Math.ceil(this.cellH * this.dpr);

    const font = `${fontPx * this.dpr}px ${style.fontFamily}`;
    const atlas = this.atlas ?? document.createElement("canvas");
    atlas.width = GLYPHS.length * (this.tileW + 2);
    atlas.height = 2 * (this.tileH + 2);
    const ctx = atlas.getContext("2d")!;
    ctx.font = font;
    ctx.textBaseline = "alphabetic";
    // Device-pixel snapped, as the browser snaps the <pre>'s text.
    const baseline = Math.round(this.measureBaseline() * this.dpr);
    const colors = getComputedStyle(root);
    [colors.getPropertyValue("--sculpture-ink"), colors.getPropertyValue("--sculpture-signal")].forEach(
      (color, row) => {
        ctx.fillStyle = color.trim();
        [...GLYPHS].forEach((glyph, i) => {
          const x = i * (this.tileW + 2);
          const y = row * (this.tileH + 2);
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, this.tileW, this.tileH);
          ctx.clip();
          ctx.fillText(glyph, x, y + baseline);
          ctx.restore();
        });
      },
    );
    this.atlas = atlas;
    this.drawnRects = [];
  }

  /**
   * Where the <pre> really puts its first baseline, in CSS px from the top of
   * the line box: line-box rounding and font metrics included, so it is
   * measured rather than derived. A zero-size inline-block sits on the baseline.
   */
  private measureBaseline(): number {
    const probe = document.createElement("div");
    probe.className = "sculpture__pre";
    probe.style.cssText = "position:absolute;inset:0;display:block;visibility:hidden";
    const marker = document.createElement("span");
    marker.style.cssText = "display:inline-block;width:0;height:0";
    probe.append("M", marker);
    this.options.root.append(probe);
    const baseline = marker.getBoundingClientRect().bottom - probe.getBoundingClientRect().top;
    probe.remove();
    return baseline;
  }

  /* Loop ------------------------------------------------------------------- */

  private updateLoop() {
    const run = this.ready && this.visible && !this.paused && !this.destroyed;
    if (run === this.running) return;
    if (run) {
      if (this.stale) this.snap();
      this.last = performance.now();
      gsap.ticker.add(this.tick);
    } else {
      gsap.ticker.remove(this.tick);
    }
    this.running = run;
  }

  private stop() {
    gsap.ticker.remove(this.tick);
    this.running = false;
  }

  private tick = () => {
    const now = performance.now();
    // 1 ms slack so a 60 Hz ticker reliably lands every second frame.
    if (now - this.last < this.frameMs - 1) return;
    const dt = Math.min(100, now - this.last);
    this.last = now;

    this.scrub(now);
    this.animate(now, dt);
    this.idle(now, dt);
    this.drawParticles(now);

    this.options.onFrame?.({
      ms: performance.now() - now,
      flights: this.flights,
      releases: this.releases,
    });
  };

  /* Progress → cells ------------------------------------------------------- */

  /** Index of the first sorted threshold greater than `p`. */
  private upper(p: number): number {
    let lo = 0;
    let hi = this.count;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedT[mid] <= p) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private scrub(now: number) {
    const from = this.shownProgress;
    const to = this.progress;
    if (from === to) return;
    this.shownProgress = to;
    if (to > from) {
      // Torso first: inner cells claim flights before the cap pushes the rest to fades.
      for (let k = this.upper(from), end = this.upper(to); k < end; k++) this.arrive(this.byT[k], now);
    } else {
      // Outer cells leave first.
      for (let k = this.upper(from) - 1, end = this.upper(to); k >= end; k--) this.depart(this.byT[k], now);
    }
  }

  private arrive(f: number, now: number) {
    const particle = this.particleOf[f];
    switch (this.mode[f]) {
      case Mode.Flight:
        if (particle?.kind === Kind.Depart) this.turn(particle, Kind.Arrive, now);
        return;
      case Mode.FadeOut:
        this.mode[f] = Mode.FadeIn;
        return;
      case Mode.Empty:
        if (this.flights < this.flightLimit) this.launch(f, Kind.Arrive, now);
        else this.fade(f, Mode.FadeIn, 0);
        return;
    }
  }

  private depart(f: number, now: number) {
    const particle = this.particleOf[f];
    switch (this.mode[f]) {
      case Mode.Flight:
        if (particle?.kind === Kind.Arrive) this.turn(particle, Kind.Depart, now);
        return;
      case Mode.FadeIn:
        this.mode[f] = Mode.FadeOut;
        return;
      case Mode.Released:
        // Its glyph is already riding the wind; just don't re-form.
        this.mode[f] = Mode.Empty;
        return;
      case Mode.Settled:
        if (this.flights < this.flightLimit) {
          this.launch(f, Kind.Depart, now);
          this.drawCell(f, now);
        } else {
          this.fade(f, Mode.FadeOut, 1);
        }
        return;
    }
  }

  private fade(f: number, mode: typeof Mode.FadeIn | typeof Mode.FadeOut, from: number) {
    this.mode[f] = mode;
    this.vis[f] = from;
    this.track(f);
  }

  private track(f: number) {
    if (this.isAnimating[f]) return;
    this.isAnimating[f] = 1;
    this.animating.push(f);
  }

  /* Particles -------------------------------------------------------------- */

  private spawn(): Particle {
    return (
      this.pool.pop() ?? {
        kind: Kind.Arrive,
        cell: -1,
        glyph: 0,
        alpha: 1,
        x0: 0,
        y0: 0,
        x1: 0,
        y1: 0,
        bow: 0,
        a0: 0,
        a1: 1,
        start: 0,
        duration: FLIGHT_MS,
      }
    );
  }

  private launch(f: number, kind: Kind, now: number) {
    const p = this.spawn();
    const col = this.cellCol[f];
    const row = this.cellRow[f];
    const spread = (min: number, max: number) => min + Math.random() * (max - min);
    p.kind = kind;
    p.cell = f;
    p.glyph = this.cellGlyph[f];
    p.alpha = this.cellAlpha[f];
    p.start = now;
    p.bow = spread(-1.2, 1.2);

    if (kind === Kind.Arrive) {
      // From 4–12 columns upwind into place.
      p.x0 = col - this.wind * spread(4, 12);
      p.y0 = row + spread(-1.5, 1.5);
      p.x1 = col;
      p.y1 = row;
      p.a0 = 0.3;
      p.a1 = 1;
      p.duration = FLIGHT_MS;
    } else if (kind === Kind.Depart) {
      // Off downwind, fading.
      p.x0 = col;
      p.y0 = row;
      p.x1 = col + this.wind * spread(4, 12);
      p.y1 = row + spread(-1.5, 1.5);
      p.a0 = 1;
      p.a1 = 0;
      p.duration = FLIGHT_MS;
    } else {
      p.cell = -1; // lets go: the cell re-forms on its own timer
      p.x0 = col;
      p.y0 = row;
      p.x1 = col + this.wind * spread(3, 7);
      p.y1 = row + spread(-2, 1);
      p.bow = spread(-0.6, 0.6);
      p.a0 = 1;
      p.a1 = 0;
      p.duration = RELEASE_MS;
    }

    if (kind === Kind.Release) {
      this.releases++;
    } else {
      this.flights++;
      this.mode[f] = Mode.Flight;
      this.particleOf[f] = p;
    }
    this.particles.push(p);
  }

  /** Reverses a flight mid-air: it continues from where it is, at the alpha it has. */
  private turn(p: Particle, kind: typeof Kind.Arrive | typeof Kind.Depart, now: number) {
    const [x, y, a] = this.sample(p, now);
    const f = p.cell;
    const col = this.cellCol[f];
    const row = this.cellRow[f];
    p.kind = kind;
    p.x0 = x;
    p.y0 = y;
    p.a0 = a;
    p.start = now;
    p.bow = (Math.random() - 0.5) * 1.2;
    if (kind === Kind.Arrive) {
      p.x1 = col;
      p.y1 = row;
      p.a1 = 1;
    } else {
      p.x1 = col + this.wind * (4 + Math.random() * 8);
      p.y1 = row + (Math.random() - 0.5) * 3;
      p.a1 = 0;
    }
  }

  /** [x, y, alpha multiplier] of a particle at `now`. */
  private sample(p: Particle, now: number): [number, number, number] {
    const k = Math.min(1, (now - p.start) / p.duration);
    // Releases drift at the wind's even pace; flights settle.
    const e = p.kind === Kind.Release ? k : this.settle(k);
    return [
      p.x0 + (p.x1 - p.x0) * e,
      p.y0 + (p.y1 - p.y0) * e + p.bow * Math.sin(Math.PI * e),
      p.a0 + (p.a1 - p.a0) * (p.kind === Kind.Release ? k : e),
    ];
  }

  private drawParticles(now: number) {
    const ctx = this.fxCtx!;
    for (const r of this.drawnRects) ctx.clearRect(r.x, r.y, r.w, r.h);
    const rects = this.nextRects;
    rects.length = 0;

    let write = 0;
    for (const p of this.particles) {
      if (now - p.start >= p.duration) {
        this.land(p, now);
        this.pool.push(p);
        continue;
      }
      this.particles[write++] = p;
      const [x, y, a] = this.sample(p, now);
      const dx = Math.round(x * this.cellW * this.dpr);
      const dy = Math.round(y * this.cellH * this.dpr);
      ctx.globalAlpha = p.alpha * a;
      ctx.drawImage(
        this.atlas!,
        p.glyph * (this.tileW + 2),
        0,
        this.tileW,
        this.tileH,
        dx,
        dy,
        this.tileW,
        this.tileH,
      );
      rects.push({ x: dx, y: dy, w: this.tileW, h: this.tileH });
    }
    this.particles.length = write;
    this.nextRects = this.drawnRects;
    this.drawnRects = rects;
  }

  private land(p: Particle, now: number) {
    if (p.kind === Kind.Release) {
      this.releases--;
      return;
    }
    this.flights--;
    const f = p.cell;
    this.particleOf[f] = null;
    if (p.kind === Kind.Depart) {
      this.mode[f] = Mode.Empty;
      return;
    }
    this.mode[f] = Mode.Settled;
    if (this.oranges < ORANGE_MAX && Math.random() < ORANGE_CHANCE) this.flash(f, now);
    this.drawCell(f, now);
  }

  private flash(f: number, now: number) {
    this.orangeUntil[f] = now + this.orangeMs;
    this.oranges++;
    this.track(f);
  }

  /* Per-frame cell work ---------------------------------------------------- */

  private animate(now: number, dt: number) {
    const step = dt / FADE_MS;
    let write = 0;
    for (const f of this.animating) {
      let busy = false;
      const mode = this.mode[f];
      if (mode === Mode.FadeIn) {
        this.vis[f] = Math.min(1, this.vis[f] + step);
        if (this.vis[f] >= 1) {
          this.mode[f] = Mode.Settled;
          if (this.shownProgress < 1 && this.oranges < ORANGE_MAX && Math.random() < ORANGE_CHANCE) {
            this.flash(f, now);
          }
        } else busy = true;
        this.drawCell(f, now);
      } else if (mode === Mode.FadeOut) {
        this.vis[f] = Math.max(0, this.vis[f] - step);
        if (this.vis[f] <= 0) this.mode[f] = Mode.Empty;
        else busy = true;
        this.drawCell(f, now);
      } else if (mode === Mode.Released) {
        if (now - this.timer[f] >= REFORM_MS) {
          this.reroll(f);
          this.mode[f] = Mode.FadeIn;
          this.vis[f] = 0;
        }
        busy = true;
      }

      if (this.orangeUntil[f]) {
        if (now >= this.orangeUntil[f] || this.mode[f] !== Mode.Settled) {
          this.orangeUntil[f] = 0;
          this.oranges--;
          this.drawCell(f, now);
        } else busy = true;
      }

      if (busy) this.animating[write++] = f;
      else this.isAnimating[f] = 0;
    }
    this.animating.length = write;
  }

  /** Idle life: re-rolls within the density bucket, and wind releases at the outer edges. */
  private idle(now: number, dt: number) {
    const rolls = this.count * RE_ROLL_PER_FRAME;
    const whole = Math.floor(rolls) + (Math.random() < rolls % 1 ? 1 : 0);
    for (let k = 0; k < whole; k++) {
      const f = (Math.random() * this.count) | 0;
      if (this.mode[f] === Mode.Settled && !this.orangeUntil[f]) {
        this.reroll(f);
        this.drawCell(f, now);
      }
    }

    const { releases, releaseRate } = this.limits;
    if (this.edges.length && this.releases < releases && Math.random() < (releaseRate * dt) / 1000) {
      const f = this.edges[(Math.random() * this.edges.length) | 0];
      if (this.mode[f] === Mode.Settled && !this.orangeUntil[f]) {
        this.launch(f, Kind.Release, now);
        this.mode[f] = Mode.Released;
        this.timer[f] = now;
        this.track(f);
        this.drawCell(f, now);
      }
    }
  }

  private reroll(f: number) {
    const bucket = this.buckets[this.cellLevel[f]];
    if (!bucket?.length) return;
    let glyph = bucket[(Math.random() * bucket.length) | 0];
    if (glyph === this.cellGlyph[f] && bucket.length > 1)
      glyph = bucket[(bucket.indexOf(glyph) + 1) % bucket.length];
    this.cellGlyph[f] = glyph;
  }

  /* Drawing ---------------------------------------------------------------- */

  private drawCell(f: number, now: number) {
    const ctx = this.baseCtx;
    if (!ctx || !this.atlas) return;
    const col = this.cellCol[f];
    const row = this.cellRow[f];
    const x = this.colX[col];
    const y = this.rowY[row];
    // The tile is cropped to this cell's own rect, so no glyph ever bleeds into a neighbour
    // (which that neighbour's clear would then miss).
    const w = this.colX[col + 1] - x;
    const h = this.rowY[row + 1] - y;
    ctx.clearRect(x, y, w, h);

    const mode = this.mode[f];
    const vis = mode === Mode.Settled ? 1 : mode === Mode.FadeIn || mode === Mode.FadeOut ? this.vis[f] : 0;
    if (vis <= 0) return;
    const signal = this.orangeUntil[f] > now ? 1 : 0;
    ctx.globalAlpha = this.cellAlpha[f] * vis;
    ctx.drawImage(
      this.atlas,
      this.cellGlyph[f] * (this.tileW + 2),
      signal * (this.tileH + 2),
      w,
      h,
      x,
      y,
      w,
      h,
    );
  }

  /** Repaints the base canvas from the current cell state (after a resize). */
  private redraw() {
    if (!this.baseCtx) return;
    const now = performance.now();
    this.baseCtx.clearRect(0, 0, this.options.base.width, this.options.base.height);
    this.fxCtx!.clearRect(0, 0, this.options.fx.width, this.options.fx.height);
    for (let f = 0; f < this.count; f++) this.drawCell(f, now);
  }

  /** Jumps straight to the current progress: no flights, no fades, final glyphs. */
  private snap() {
    for (const p of this.particles) this.pool.push(p);
    this.particles.length = 0;
    this.particleOf.fill(null);
    this.flights = 0;
    this.releases = 0;
    this.oranges = 0;
    this.orangeUntil.fill(0);
    this.isAnimating.fill(0);
    this.animating.length = 0;
    this.drawnRects = [];
    this.cellGlyph.set(this.finalGlyph);
    const formed = this.upper(this.progress);
    this.mode.fill(Mode.Empty);
    for (let k = 0; k < formed; k++) this.mode[this.byT[k]] = Mode.Settled;
    this.shownProgress = this.progress;
    this.stale = false;
    this.redraw();
  }
}

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
