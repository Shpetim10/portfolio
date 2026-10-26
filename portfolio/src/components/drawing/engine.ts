"use client";

import { cssDuration } from "@/motion/bezier";
import { gsap } from "@/motion/gsap";
import { frontNoise } from "@/motion/noise";
import { inkCellsOf } from "./grid";
import { FAMILIES, familyOf, levelAlpha, levelOf, type DrawingData, type DrawingSize } from "./model";

/*
 * T09c · The canvas side of GlyphLineDrawing. Plain TypeScript, no React: the
 * component owns one engine per (size, tier) and feeds it progress.
 *
 * One canvas over the <pre>. Every glyph is a drawImage from a pre-rendered
 * atlas with the cell's alpha as globalAlpha, and only dirty cells are cleared
 * and redrawn — a settled figure costs nothing per frame but the idle swap.
 *
 * Progress → cells: ink cells are sorted by their threshold t (navel outward,
 * ragged front), so a progress change only touches the cells whose t lies
 * between the old and the new value (binary search), never the whole grid.
 *
 * The loop runs on the GSAP ticker (the site's single RAF), capped at 30 fps
 * (20 on low tier), and is detached entirely when off-screen. While it runs,
 * the root carries data-running, which also runs the CSS compass orbit.
 */

/** The figure's share of the progress range (T09c). */
const FIGURE_FROM = 0.45;
const FIGURE_TO = 0.95;
/** One figure glyph swaps for a sibling about this often (T09c). */
const SWAP_MS = 300;
const DPR_MAX = 2;

const GLYPHS = Object.values(FAMILIES).join("");

const Mode = {
  Empty: 0,
  FadeIn: 1,
  /** The single bright frame between the fade-in and settling: ink touching paper. */
  Touch: 2,
  Settled: 3,
  FadeOut: 4,
} as const;

export type DrawingStats = {
  /** Main-thread ms spent on the frame. */
  ms: number;
  /** Cells fading in or out this frame. */
  active: number;
};

export type EngineOptions = {
  data: DrawingData;
  size: DrawingSize;
  lowTier: boolean;
  root: HTMLElement;
  pre: HTMLElement;
  canvas: HTMLCanvasElement;
  progress: number;
  onReady: () => void;
  onFrame?: (stats: DrawingStats) => void;
};

/** Figure progress (0–1) within the whole sequence. */
const figureProgress = (progress: number) =>
  Math.min(1, Math.max(0, (progress - FIGURE_FROM) / (FIGURE_TO - FIGURE_FROM)));

export class DrawingEngine {
  private readonly options: EngineOptions;
  private readonly cols: number;
  private readonly rows: number;
  private readonly frameMs: number;
  private readonly fadeMs: number;

  // Ink cells (index f), structure of arrays.
  private readonly count: number;
  private readonly cellCol: Uint16Array;
  private readonly cellRow: Uint16Array;
  private readonly cellAlpha: Float32Array;
  private readonly cellGlyph: Uint8Array;
  /** The final grid's glyphs, which a snap restores. */
  private readonly finalGlyph: Uint8Array;
  /** Atlas indices of each cell's family siblings (for the idle swap); empty when it has none. */
  private readonly siblings: Uint8Array[];
  private readonly mode: Uint8Array;
  private readonly vis: Float32Array;
  /** Ink cells sorted by threshold t, and the sorted thresholds. */
  private readonly byT: Uint16Array;
  private readonly sortedT: Float32Array;

  private readonly animating: number[] = [];
  private readonly isAnimating: Uint8Array;

  private atlas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private tileW = 0;
  private tileH = 0;
  private colX: Int32Array = new Int32Array(0);
  private rowY: Int32Array = new Int32Array(0);

  private progress: number;
  private shown = 0;
  private visible = false;
  private ready = false;
  private destroyed = false;
  /** Progress moved while nobody was looking: jump to it instead of animating. */
  private stale = true;
  private running = false;
  private last = 0;
  private swapClock = 0;
  /** The one cell the idle swap has off its traced glyph, or −1. */
  private swapped = -1;

  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  constructor(options: EngineOptions) {
    this.options = options;
    const grid = options.data.grids[options.size];
    this.cols = grid.cols;
    this.rows = grid.rows;
    this.frameMs = 1000 / (options.lowTier ? 20 : 30);
    this.fadeMs = cssDuration("micro") * 1000;
    this.progress = clamp01(options.progress);

    const cells = inkCellsOf(grid);
    const lines = grid.text.split("\n");
    const n = cells.count;
    this.count = n;
    this.cellCol = new Uint16Array(n);
    this.cellRow = new Uint16Array(n);
    this.cellAlpha = new Float32Array(n);
    this.cellGlyph = new Uint8Array(n);
    this.finalGlyph = new Uint8Array(n);
    this.siblings = new Array<Uint8Array>(n);
    this.mode = new Uint8Array(n);
    this.vis = new Float32Array(n);
    this.isAnimating = new Uint8Array(n);
    const cellT = new Float32Array(n);

    const familyIndices = new Map<string, Uint8Array>();
    for (let f = 0; f < n; f++) {
      const i = cells.index[f];
      const col = i % this.cols;
      const row = (i / this.cols) | 0;
      const glyph = lines[row]?.[col] ?? ".";
      const family = familyOf(glyph);
      if (!familyIndices.has(family)) {
        familyIndices.set(
          family,
          Uint8Array.from([...family], (g) => GLYPHS.indexOf(g)),
        );
      }
      this.cellCol[f] = col;
      this.cellRow[f] = row;
      this.cellAlpha[f] = levelAlpha(levelOf(cells.coverage[f]));
      this.finalGlyph[f] = Math.max(0, GLYPHS.indexOf(glyph));
      this.siblings[f] = familyIndices.get(family)!;
      // t = order × 0.85 + noise × 0.15; never exactly 0, so figure progress 0 is an empty sheet.
      cellT[f] = Math.max(1e-4, (cells.order[f] / 255) * 0.85 + frontNoise(col, row, this.cols) * 0.15);
    }
    this.cellGlyph.set(this.finalGlyph);
    this.byT = Uint16Array.from({ length: n }, (_, f) => f).sort((a, b) => cellT[a] - cellT[b] || a - b);
    this.sortedT = Float32Array.from(this.byT, (f) => cellT[f]);

    void this.start();
  }

  /* Public API ------------------------------------------------------------- */

  setProgress(progress: number) {
    this.progress = clamp01(progress);
    if (this.ready && !this.visible) this.stale = true;
  }

  destroy() {
    this.destroyed = true;
    this.stop();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.ctx?.clearRect(0, 0, this.options.canvas.width, this.options.canvas.height);
  }

  /* Setup ------------------------------------------------------------------ */

  private async start() {
    const { pre, root, canvas } = this.options;
    const style = getComputedStyle(pre);
    // Draw in the real face, never its metric-matched fallback.
    await document.fonts.load(`${style.fontSize} ${style.fontFamily}`).catch(() => []);
    if (this.destroyed) return;

    this.ctx = canvas.getContext("2d");
    if (!this.ctx) return;
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
    const { pre, canvas, root } = this.options;
    const box = pre.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const style = getComputedStyle(pre);
    const fontPx = parseFloat(style.fontSize);
    this.dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
    const cellW = box.width / this.cols;
    const cellH = box.height / this.rows;
    canvas.width = Math.round(box.width * this.dpr);
    canvas.height = Math.round(box.height * this.dpr);
    this.colX = Int32Array.from({ length: this.cols + 1 }, (_, c) => Math.round(c * cellW * this.dpr));
    this.rowY = Int32Array.from({ length: this.rows + 1 }, (_, r) => Math.round(r * cellH * this.dpr));
    this.tileW = Math.ceil(cellW * this.dpr);
    this.tileH = Math.ceil(cellH * this.dpr);

    const atlas = this.atlas ?? document.createElement("canvas");
    atlas.width = GLYPHS.length * (this.tileW + 2);
    atlas.height = this.tileH;
    const ctx = atlas.getContext("2d")!;
    ctx.font = `${fontPx * this.dpr}px ${style.fontFamily}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = getComputedStyle(root).getPropertyValue("--drawing-ink").trim();
    // Device-pixel snapped, as the browser snaps the <pre>'s text.
    const baseline = Math.round(this.measureBaseline() * this.dpr);
    [...GLYPHS].forEach((glyph, i) => {
      const x = i * (this.tileW + 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, 0, this.tileW, this.tileH);
      ctx.clip();
      ctx.fillText(glyph, x, baseline);
      ctx.restore();
    });
    this.atlas = atlas;
  }

  /**
   * Where the <pre> really puts its first baseline, in CSS px from the top of
   * the line box: line-box rounding and font metrics included, so it is
   * measured rather than derived. A zero-size inline-block sits on the baseline.
   */
  private measureBaseline(): number {
    const probe = document.createElement("div");
    probe.className = "drawing__pre";
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
    const run = this.ready && this.visible && !this.destroyed;
    if (run === this.running) return;
    if (run) {
      if (this.stale) this.snap();
      this.last = performance.now();
      gsap.ticker.add(this.tick);
      this.options.root.dataset.running = "";
    } else {
      this.stop();
    }
    this.running = run;
  }

  private stop() {
    gsap.ticker.remove(this.tick);
    delete this.options.root.dataset.running;
    this.running = false;
  }

  private tick = () => {
    const now = performance.now();
    // 1 ms slack so a 60 Hz ticker reliably lands every second frame.
    if (now - this.last < this.frameMs - 1) return;
    const dt = Math.min(100, now - this.last);
    this.last = now;

    this.scrub();
    this.animate(dt);
    this.swap(dt);

    this.options.onFrame?.({ ms: performance.now() - now, active: this.animating.length });
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

  private scrub() {
    const from = this.shown;
    const to = figureProgress(this.progress);
    if (from === to) return;
    this.shown = to;
    if (to > from) {
      for (let k = this.upper(from), end = this.upper(to); k < end; k++) this.appear(this.byT[k]);
    } else {
      for (let k = this.upper(from) - 1, end = this.upper(to); k >= end; k--) this.vanish(this.byT[k]);
    }
  }

  private appear(f: number) {
    const mode = this.mode[f];
    if (mode === Mode.Empty) this.vis[f] = 0;
    if (mode === Mode.Empty || mode === Mode.FadeOut) {
      this.mode[f] = Mode.FadeIn;
      this.track(f);
    }
  }

  private vanish(f: number) {
    const mode = this.mode[f];
    if (mode === Mode.Empty || mode === Mode.FadeOut) return;
    // Scrubbing back skips the bright frame: ink only flashes on its way in.
    if (mode !== Mode.FadeIn) this.vis[f] = 1;
    this.mode[f] = Mode.FadeOut;
    this.track(f);
  }

  private track(f: number) {
    if (this.isAnimating[f]) return;
    this.isAnimating[f] = 1;
    this.animating.push(f);
  }

  /* Per-frame cell work ---------------------------------------------------- */

  private animate(dt: number) {
    const step = dt / this.fadeMs;
    let write = 0;
    for (const f of this.animating) {
      let busy = true;
      switch (this.mode[f]) {
        case Mode.FadeIn:
          this.vis[f] = Math.min(1, this.vis[f] + step);
          if (this.vis[f] >= 1) this.mode[f] = Mode.Touch;
          break;
        case Mode.Touch:
          this.mode[f] = Mode.Settled;
          busy = false;
          break;
        case Mode.FadeOut:
          this.vis[f] = Math.max(0, this.vis[f] - step);
          if (this.vis[f] <= 0) {
            this.mode[f] = Mode.Empty;
            busy = false;
          }
          break;
        default:
          busy = false;
      }
      this.drawCell(f);
      if (busy) this.animating[write++] = f;
      else this.isAnimating[f] = 0;
    }
    this.animating.length = write;
  }

  /**
   * Idle life: about every SWAP_MS, one settled glyph trades places with a
   * sibling of its family, and the previous one returns to its traced glyph,
   * so the figure never drifts from the drawing.
   */
  private swap(dt: number) {
    this.swapClock += dt;
    if (this.swapClock < SWAP_MS) return;
    this.swapClock %= SWAP_MS;
    const back = this.swapped;
    this.swapped = -1;
    if (back >= 0 && this.cellGlyph[back] !== this.finalGlyph[back]) {
      this.cellGlyph[back] = this.finalGlyph[back];
      this.drawCell(back);
    }
    // A few tries to land on a settled cell whose family has more than one glyph.
    for (let attempt = 0; attempt < 8; attempt++) {
      const f = (Math.random() * this.count) | 0;
      const family = this.siblings[f];
      if (this.mode[f] !== Mode.Settled || family.length < 2) continue;
      const at = family.indexOf(this.cellGlyph[f]);
      this.cellGlyph[f] = family[(at + 1 + ((Math.random() * (family.length - 1)) | 0)) % family.length];
      this.swapped = f;
      this.drawCell(f);
      return;
    }
  }

  /* Drawing ---------------------------------------------------------------- */

  private drawCell(f: number) {
    const ctx = this.ctx;
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
    if (mode === Mode.Empty) return;
    ctx.globalAlpha =
      mode === Mode.Touch ? 1 : mode === Mode.Settled ? this.cellAlpha[f] : this.cellAlpha[f] * this.vis[f];
    ctx.drawImage(this.atlas, this.cellGlyph[f] * (this.tileW + 2), 0, w, h, x, y, w, h);
  }

  /** Repaints the canvas from the current cell state (after a resize). */
  private redraw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.options.canvas.width, this.options.canvas.height);
    for (let f = 0; f < this.count; f++) this.drawCell(f);
  }

  /** Jumps straight to the current progress: no fades, final glyphs. */
  private snap() {
    this.isAnimating.fill(0);
    this.animating.length = 0;
    this.cellGlyph.set(this.finalGlyph);
    this.shown = figureProgress(this.progress);
    const formed = this.upper(this.shown);
    this.mode.fill(Mode.Empty);
    for (let k = 0; k < formed; k++) this.mode[this.byT[k]] = Mode.Settled;
    this.stale = false;
    this.redraw();
  }
}

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
