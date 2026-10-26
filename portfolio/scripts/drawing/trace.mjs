/**
 * T09c · Build-time tracer for the glyph line drawing.  `pnpm drawing`
 *
 * Reads assets-src/vitruvian/vitruvian-man.jpg, its config.json and the glyph
 * atlas glyphs.png (from glyphs.mjs, `pnpm drawing:glyphs`), and writes
 *  - src/content/drawing/vitruvian.json: per grid size (desktop / mobile) the
 *    ink cells of the figure with their coverage, stroke direction and
 *    formation order, the FINAL glyph grid as text for the server-rendered
 *    <pre>, and Leonardo's square, circle and navel, normalised;
 *  - public/assets/lab/vitruvian-scan.webp: the cropped scan, for the lab's
 *    alignment overlay.
 *
 * Pipeline, on the crop (config.crop, in sheet pixels — everything else in the
 * config is normalised to the crop):
 *  1. Greyscale. The paper tone, stains and the lighting gradient are estimated
 *     by a max filter (which erases the thin dark strokes) and a wide blur, and
 *     divided out: darkness = (background − pixel) / background.
 *  2. Adaptive threshold: ink where darkness exceeds inkThreshold × the
 *     strongest ink in the drawing (a high percentile, so it is robust).
 *  3. Only the inside of the circle is traced, minus a band of geometryMaskPx
 *     around Leonardo's own square and circle (code redraws them), minus the
 *     `exclude` rects (handwriting and stains inside the circle). Hysteresis
 *     keeps only ink connected to a dark core (SEED); specks under MIN_EXTENT
 *     px go, and so do background hatching and small islands off the figure.
 *  4. The ink is thinned to one-pixel centrelines and redrawn at glyph
 *     resolution (MATCH_W × MATCH_H px per cell, monospace ratio CELL_RATIO)
 *     as lines of the font's own stem width.
 *  5. Each cell takes the glyph whose shape, as the browser renders it (the
 *     atlas), correlates best with its patch of those lines (both blurred, so
 *     a pixel's offset does not matter; a margin around the cell lets strokes
 *     run on into the neighbours), or stays empty when too little line
 *     crosses it. Line cells choose among strokes, curves and ticks only.
 *  6. The head (config.tone ellipses) is shading as much as contour: there the
 *     target is its darkness, and the glyph with the least squared error wins,
 *     so a cell's tone counts as well as its shape (hair, eyes, shadows).
 *  7. Alpha comes from the ink coverage, normalised to one stroke of STROKE_PX
 *     crossing the cell. Formation order = distance from the navel (in image
 *     pixels, so it is round, not stretched by the cell shape), normalised 0–1.
 *
 * Deterministic: the same inputs always produce byte-identical output.
 * `--debug <dir>` also writes the traced ink mask there as ink.png.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CELL_RATIO, CROSSING, FAMILIES, LEVELS, Stroke } from "../../src/components/drawing/model.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const SOURCE_DIR = resolve(ROOT, "assets-src/vitruvian");
const IMAGE = resolve(SOURCE_DIR, "vitruvian-man.jpg");
const CONFIG = resolve(SOURCE_DIR, "config.json");
const GLYPHS_PNG = resolve(SOURCE_DIR, "glyphs.png");
const GLYPHS_JSON = resolve(SOURCE_DIR, "glyphs.json");
const OUT = resolve(ROOT, "src/content/drawing/vitruvian.json");
const SCAN_OUT = resolve(ROOT, "public/assets/lab/vitruvian-scan.webp");
const BUDGET = 30 * 1024;
/** The lab overlay only needs to cover the drawing's box on screen. */
const SCAN_SIZE = 860;

/*
 * Sizes in px are at the crop's resolution (1720 px across the drawing, where
 * one of Leonardo's strokes is 4–5 px wide).
 */
/** Max-filter width (px) that erases a stroke from the background estimate. */
const BG_DILATE = 13;
/** Blur (σ, px) of the background estimate: smooth enough to keep stains, not strokes. */
const BG_SIGMA = 24;
/** Percentile of darkness inside the traced region taken as "full ink". */
const INK_REF_PERCENTILE = 0.995;
/** Hysteresis: an ink component is kept only if some pixel of it reaches this share of full ink. */
const SEED = 0.7;
/** Ink components spanning fewer px than this (either axis) are paper grain or dust, not strokes. */
const MIN_EXTENT = 24;
/**
 * Hatching: a pixel of a short near-horizontal stroke (horizontal run under
 * HATCH_LENGTH px) with HATCH_BANDS or more separate ink bands within
 * ±HATCH_REACH px above and below.
 */
const HATCH_BANDS = 4;
const HATCH_REACH = 20;
const HATCH_LENGTH = 64;
/** Gaps (px) a stroke may have and still be one run; paper (px) that separates two bands. */
const RUN_GAP = 3;
const BAND_GAP = 3;
/** A lone stroke no taller than this (px) and shorter than HATCH_LENGTH is a hatching leftover. */
const DASH_HEIGHT = 8;
/** Ink components this large (px, either axis) are strokes of the figure; smaller ones must lie within NEAR px of one. */
const MAJOR_EXTENT = 120;
const NEAR = 12;
/** Width (px) of one of Leonardo's strokes: one stroke across a cell = full coverage. */
const STROKE_PX = 4.4;
/** Least coverage of a cell that takes a glyph: a faint stroke still draws, at the lower levels. */
const LINE_COVERAGE = 150;
/** Shaded regions (config.tone): darkness at and above TONE_FULL is the darkest target; each region sets its own floor. */
const TONE_FULL = 0.62;
/** Matching tile (px per cell): the glyph atlas downsampled, and the target drawn, at this size. */
const MATCH_W = 12;
const MATCH_H = 20;
/** Matching margin (px) around each cell, and the blur (σ, px) that makes the match tolerant of a pixel's offset. */
const PAD = 5;
const MATCH_SIGMA = 2;
/** A line cell stays empty below this much target ink: EMPTY × one stem crossing it top to bottom. */
const EMPTY = 0.45;
/** The glyphs a line cell is matched against: strokes, curves and ticks, no knots. */
const LINE_GLYPHS = "|/\\-_¯()',.";
/** A head cell may also take tone: these, with the line glyphs. */
const HEAD_GLYPHS = "~:·+x*#%&@";

/* Image ------------------------------------------------------------------- */

async function loadInk(config) {
  const { left, top, size } = config.crop;
  const N = size;
  const grey = await sharp(IMAGE).extract({ left, top, width: N, height: N }).greyscale().raw().toBuffer();
  const background = await sharp(maxFilter(grey, N, BG_DILATE), { raw: { width: N, height: N, channels: 1 } })
    .blur(BG_SIGMA)
    .raw()
    .toBuffer();

  const dark = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    dark[i] = Math.max(0, background[i] - grey[i]) / Math.max(1, background[i]);
  }

  // The traced region: inside the circle, clear of Leonardo's lines and the excluded rects.
  const { square, circle } = config;
  const mask = config.geometryMaskPx;
  const cx = circle.cx * N;
  const cy = circle.cy * N;
  const r = circle.r * N;
  const sx0 = square.x * N;
  const sy0 = square.y * N;
  const sx1 = sx0 + square.size * N;
  const sy1 = sy0 + square.size * N;
  const segment = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  const excluded = (x, y) =>
    config.exclude.some((e) => x >= e.x * N && x < (e.x + e.w) * N && y >= e.y * N && y < (e.y + e.h) * N);

  const region = new Uint8Array(N * N);
  const inside = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      if (Math.hypot(px - cx, py - cy) > r - mask) continue;
      const nearSquare = Math.min(
        segment(px, py, sx0, sy0, sx1, sy0),
        segment(px, py, sx1, sy0, sx1, sy1),
        segment(px, py, sx1, sy1, sx0, sy1),
        segment(px, py, sx0, sy1, sx0, sy0),
      );
      if (nearSquare <= mask || excluded(px, py)) continue;
      region[y * N + x] = 1;
      inside.push(dark[y * N + x]);
    }
  }

  inside.sort((a, b) => a - b);
  const full = inside[Math.floor(inside.length * INK_REF_PERCENTILE)] || 1;
  const ink = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const level = dark[i] / full;
    if (region[i] && level > config.inkThreshold) ink[i] = Math.min(1, level);
  }
  dropSpecks(ink, N);
  dropHatching(ink, N);
  dropSpecks(ink, N);
  dropStrays(ink, N);
  return { N, ink, tone: dark, line: centrelines(ink, N) };
}

/**
 * Clears Leonardo's shading: stacks of short parallel near-horizontal strokes.
 * At glyph resolution they would fill whole regions with dashes and read as a
 * mass, not as linework. A pixel counts as hatching when its stroke runs
 * horizontally but briefly (horizontal ink run under HATCH_LENGTH and at least
 * twice its vertical one) and its column crosses HATCH_BANDS or more separate
 * strokes within HATCH_REACH. Contours — lone or long lines — survive.
 */
function dropHatching(ink, N) {
  // The span of the stroke through (x, y) along (dx, dy), stepping over gaps of up to RUN_GAP px.
  const run = (x, y, dx, dy) => {
    let length = 1;
    for (const s of [-1, 1]) {
      for (let k = 1, gap = 0; gap <= RUN_GAP; k++) {
        const nx = x + s * k * dx;
        const ny = y + s * k * dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) break;
        if (ink[ny * N + nx]) {
          length = Math.max(length, k + 1);
          gap = 0;
        } else gap++;
      }
    }
    return length;
  };
  const hatch = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!ink[y * N + x]) continue;
      const across = run(x, y, 1, 0);
      if (across >= HATCH_LENGTH || across < 2 * run(x, y, 0, 1)) continue;
      // Separate strokes: ink after at least BAND_GAP px of paper (a stroke the threshold split is one band).
      let bands = 0;
      let paper = BAND_GAP;
      for (let k = Math.max(0, y - HATCH_REACH), end = Math.min(N - 1, y + HATCH_REACH); k <= end; k++) {
        if (ink[k * N + x] > 0) {
          if (paper >= BAND_GAP) bands++;
          paper = 0;
        } else paper++;
      }
      if (bands >= HATCH_BANDS) hatch.push(y * N + x);
    }
  }
  for (const i of hatch) ink[i] = 0;
}

/**
 * Clears what is left of the background hatching: small ink islands off the
 * figure. Components spanning MAJOR_EXTENT px or more are the figure's strokes;
 * a smaller one survives only within NEAR px of one of them (a fingertip, a
 * feature of the face, a stroke the threshold broke in two).
 */
function dropStrays(ink, N) {
  const label = new Int32Array(N * N).fill(-1);
  const extents = [];
  const stack = [];
  for (let start = 0; start < N * N; start++) {
    if (!ink[start] || label[start] >= 0) continue;
    const id = extents.length;
    let [x0, y0, x1, y1] = [N, N, 0, 0];
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop();
      const x = i % N;
      const y = (i / N) | 0;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const j = ny * N + nx;
          if (ink[j] && label[j] < 0) {
            label[j] = id;
            stack.push(j);
          }
        }
      }
    }
    extents.push(Math.max(x1 - x0, y1 - y0) + 1);
  }
  const major = (i) => label[i] >= 0 && extents[label[i]] >= MAJOR_EXTENT;
  // Within NEAR px of the figure (a square neighbourhood): a max filter over the major mask.
  const near = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) near[i] = major(i) ? 1 : 0;
  const spread = maxFilter(near, N, 2 * NEAR + 1);
  const keep = new Uint8Array(extents.length);
  for (let i = 0; i < N * N; i++) if (label[i] >= 0 && spread[i]) keep[label[i]] = 1;
  for (let i = 0; i < N * N; i++) if (label[i] >= 0 && !keep[label[i]]) ink[i] = 0;
}

/**
 * Greyscale max filter over a width × width box, separable. (sharp's dilate is
 * a binary morphology op: it would turn the whole page white.)
 */
function maxFilter(pixels, N, width) {
  const half = width >> 1;
  const pass = (source, horizontal) => {
    const out = new Uint8Array(N * N);
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++) {
        let max = 0;
        for (let k = Math.max(0, b - half), end = Math.min(N - 1, b + half); k <= end; k++) {
          const v = horizontal ? source[a * N + k] : source[k * N + a];
          if (v > max) max = v;
        }
        out[horizontal ? a * N + b : b * N + a] = max;
      }
    }
    return out;
  };
  return pass(pass(pixels, true), false);
}

/**
 * Hysteresis and speck removal on 8-connected ink components, in scan order
 * (deterministic): a component survives only with a pixel at SEED or darker
 * (light hatching and paper tone have none) and an extent of MIN_EXTENT px;
 * a lone dash (≤ DASH_HEIGHT px tall, shorter than HATCH_LENGTH) is a hatching leftover.
 */
function dropSpecks(ink, N) {
  const seen = new Uint8Array(N * N);
  const stack = [];
  const component = [];
  for (let start = 0; start < N * N; start++) {
    if (!ink[start] || seen[start]) continue;
    component.length = 0;
    stack.push(start);
    seen[start] = 1;
    let peak = 0;
    let [x0, y0, x1, y1] = [N, N, 0, 0];
    while (stack.length) {
      const i = stack.pop();
      component.push(i);
      const x = i % N;
      const y = (i / N) | 0;
      peak = Math.max(peak, ink[i]);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const j = ny * N + nx;
          if (ink[j] && !seen[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
    }
    const width = x1 - x0 + 1;
    const height = y1 - y0 + 1;
    // A lone short dash is the last stroke of a hatching stack.
    const dash = height <= DASH_HEIGHT && width < HATCH_LENGTH;
    if (peak < SEED || Math.max(width, height) < MIN_EXTENT || dash) for (const i of component) ink[i] = 0;
  }
}

/* Centrelines ------------------------------------------------------------- */

/**
 * The centreline of every stroke, one pixel wide: the ink, closed by one pixel
 * (so a stroke Leonardo drew twice, a hair apart, becomes one line) and thinned
 * by Zhang–Suen. Sampling the centreline instead of the ink's coverage puts a
 * glyph wherever a stroke passes, so contours stay unbroken at any grid size.
 */
function centrelines(ink, N) {
  const on = new Uint8Array(N * N);
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      let hit = 0;
      for (let dy = -1; dy <= 1 && !hit; dy++)
        for (let dx = -1; dx <= 1 && !hit; dx++) hit = ink[(y + dy) * N + x + dx] > 0;
      on[y * N + x] = hit ? 1 : 0;
    }
  }
  // Zhang–Suen: P2…P9 clockwise from north.
  const OFFSETS = [-N, -N + 1, 1, N + 1, N, N - 1, -1, -N - 1];
  const doomed = [];
  for (let changed = true; changed;) {
    changed = false;
    for (const pass of [0, 1]) {
      doomed.length = 0;
      for (let y = 1; y < N - 1; y++) {
        for (let x = 1; x < N - 1; x++) {
          const i = y * N + x;
          if (!on[i]) continue;
          const p = OFFSETS.map((o) => on[i + o]);
          const neighbours = p.reduce((a, b) => a + b, 0);
          if (neighbours < 2 || neighbours > 6) continue;
          let transitions = 0;
          for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) transitions++;
          if (transitions !== 1) continue;
          const [n, , e, , s, , w] = p;
          if (pass === 0 ? n * e * s || e * s * w : n * e * w || n * s * w) continue;
          doomed.push(i);
        }
      }
      for (const i of doomed) on[i] = 0;
      if (doomed.length) changed = true;
    }
  }
  return on;
}

/* Glyph shapes ------------------------------------------------------------ */

/**
 * The glyphs as the browser draws them (glyphs.png, from glyphs.mjs), box-
 * downsampled to the matching tile (MATCH_W × MATCH_H), padded by PAD px and
 * blurred, with the squared norm each match needs.
 */
async function loadGlyphs() {
  const meta = JSON.parse(await readFile(GLYPHS_JSON, "utf8"));
  if (meta.glyphs !== Object.values(FAMILIES).join("")) {
    throw new Error("[drawing] glyphs.png is stale (FAMILIES changed): run `pnpm drawing:glyphs`");
  }
  const list = [...meta.glyphs];
  const { data } = await sharp(GLYPHS_PNG).greyscale().raw().toBuffer({ resolveWithObject: true });
  const f = meta.tileW / MATCH_W;
  const stride = meta.tileW * list.length;
  const PW = MATCH_W + 2 * PAD;
  const PH = MATCH_H + 2 * PAD;
  const shapes = list.map((glyph, k) => {
    const tile = new Float32Array(PW * PH);
    for (let y = 0; y < MATCH_H; y++) {
      for (let x = 0; x < MATCH_W; x++) {
        let sum = 0;
        for (let j = 0; j < f; j++)
          for (let i = 0; i < f; i++) sum += data[(y * f + j) * stride + k * meta.tileW + x * f + i];
        tile[(y + PAD) * PW + x + PAD] = sum / (255 * f * f);
      }
    }
    const ink = tile.reduce((a, b) => a + b, 0);
    const shape = blur(tile, PW, PH, MATCH_SIGMA);
    return { glyph, ink, shape, norm: shape.reduce((a, v) => a + v * v, 0) };
  });
  // The stem of "|": the stroke width the lines are drawn at, so a line and its glyph weigh the same.
  const stem = shapes.find((s) => s.glyph === "|").ink / MATCH_H;
  // The ink density of the densest glyph: what the darkest shade asks for.
  const densest = Math.max(...shapes.map((s) => s.ink)) / (MATCH_W * MATCH_H);
  return { shapes, stem, densest };
}

/** Separable Gaussian blur of a w × h float image (zero outside). */
function blur(pixels, w, h, sigma) {
  const radius = Math.ceil(3 * sigma);
  const kernel = Array.from({ length: 2 * radius + 1 }, (_, i) =>
    Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)),
  );
  const total = kernel.reduce((a, b) => a + b, 0);
  const k = kernel.map((v) => v / total);
  const pass = (source, horizontal) => {
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let t = -radius; t <= radius; t++) {
          const sx = horizontal ? x + t : x;
          const sy = horizontal ? y : y + t;
          if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
          sum += source[sy * w + sx] * k[t + radius];
        }
        out[y * w + x] = sum;
      }
    }
    return out;
  };
  return pass(pass(pixels, true), false);
}

/* Grid -------------------------------------------------------------------- */

/** Stroke code per family (the `dir` byte), for the families that have one. */
const FAMILY_STROKE = {
  vertical: Stroke.Vertical,
  left: Stroke.Vertical,
  right: Stroke.Vertical,
  slash: Stroke.Slash,
  backslash: Stroke.Backslash,
  dash: Stroke.Horizontal,
  low: Stroke.Horizontal,
  high: Stroke.Horizontal,
  wave: Stroke.Horizontal,
};
const KNOTS = new Set(["cross", "dense"]);

/**
 * The two targets the glyphs are matched against, at MATCH_W × MATCH_H px per
 * cell, blurred by MATCH_SIGMA:
 *  - lines: every centreline redrawn as an antialiased line of the glyphs' own
 *    stem width;
 *  - shade, inside the tone regions only (the head): the darkness, from the
 *    region's floor (paper) to TONE_FULL, scaled to the ink density of the
 *    densest glyph, so a dark patch asks for as much ink as a glyph can give.
 * `shaded` marks the cells whose centre lies in a tone region.
 */
function renderTargets({ N, line, tone }, cols, rows, config, { stem, densest }) {
  const W = cols * MATCH_W;
  const H = rows * MATCH_H;
  const sx = W / N;
  const sy = H / N;
  const r = stem / 2;
  const regionAt = (px, py) =>
    config.tone.find((e) => ((px - e.cx * N) / (e.rx * N)) ** 2 + ((py - e.cy * N) / (e.ry * N)) ** 2 <= 1);

  const lines = new Float32Array(W * H);
  const segment = (ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r - 1));
    const y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + r + 1));
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r - 1));
    const x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + r + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5 - ax;
        const py = y + 0.5 - ay;
        const t = len2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / len2)) : 0;
        const v = Math.max(0, Math.min(1, r + 0.5 - Math.hypot(px - t * dx, py - t * dy)));
        if (v > lines[y * W + x]) lines[y * W + x] = v;
      }
    }
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!line[y * N + x]) continue;
      const ax = (x + 0.5) * sx;
      const ay = (y + 0.5) * sy;
      segment(ax, ay, ax, ay);
      // Forward neighbours only: each link is drawn once.
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [1, 1],
        [-1, 1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < N && ny < N && line[ny * N + nx])
          segment(ax, ay, (nx + 0.5) * sx, (ny + 0.5) * sy);
      }
    }
  }

  const shade = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = (x + 0.5) / sx;
      const py = (y + 0.5) / sy;
      const region = regionAt(px, py);
      if (!region) continue;
      const t = tone[Math.min(N - 1, Math.floor(py)) * N + Math.min(N - 1, Math.floor(px))];
      shade[y * W + x] = densest * Math.max(0, Math.min(1, (t - region.floor) / (TONE_FULL - region.floor)));
    }
  }

  const shaded = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++)
      shaded[row * cols + col] = regionAt(((col + 0.5) * N) / cols, ((row + 0.5) * N) / rows) ? 1 : 0;

  return {
    W,
    H,
    lines: blur(lines, W, H, MATCH_SIGMA),
    shade: blur(shade, W, H, MATCH_SIGMA),
    shaded,
  };
}

function sampleGrid(traced, cols, config, glyphs) {
  const { N, ink } = traced;
  const rows = Math.round(cols * CELL_RATIO);
  const cellW = N / cols;
  const cellH = N / rows;
  const navelX = config.navel.x * N;
  const navelY = config.navel.y * N;
  const total = cols * rows;
  const { W, H, lines, shade, shaded } = renderTargets(traced, cols, rows, config, glyphs);
  const PW = MATCH_W + 2 * PAD;
  const PH = MATCH_H + 2 * PAD;
  const patch = new Float32Array(PW * PH);
  const lineShapes = glyphs.shapes.filter((s) => LINE_GLYPHS.includes(s.glyph));
  const headShapes = glyphs.shapes.filter(
    (s) => LINE_GLYPHS.includes(s.glyph) || HEAD_GLYPHS.includes(s.glyph),
  );
  const familyOfGlyph = new Map(
    Object.entries(FAMILIES).flatMap(([family, list]) => [...list].map((glyph) => [glyph, family])),
  );

  /** Copies the cell's patch of a target, with its PAD margin (zero off the image); returns its sum inside the cell and its squared norm. */
  const take = (target, col, row) => {
    let inside = 0;
    let norm = 0;
    for (let y = 0; y < PH; y++) {
      const ty = row * MATCH_H - PAD + y;
      for (let x = 0; x < PW; x++) {
        const tx = col * MATCH_W - PAD + x;
        const v = tx >= 0 && ty >= 0 && tx < W && ty < H ? target[ty * W + tx] : 0;
        patch[y * PW + x] = v;
        norm += v * v;
        if (x >= PAD && y >= PAD && x < PAD + MATCH_W && y < PAD + MATCH_H) inside += v;
      }
    }
    return { inside, norm };
  };
  const dot = (shape) => {
    let sum = 0;
    for (let p = 0; p < patch.length; p++) sum += patch[p] * shape[p];
    return sum;
  };

  let cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      let best = null;
      if (shaded[i]) {
        // Tone and shape together: least ‖patch − glyph‖², the empty cell (score 0) included.
        // ‖patch‖² is the same for every candidate, so compare ‖glyph‖² − 2 ⟨patch, glyph⟩.
        take(shade, col, row);
        let bestScore = 0;
        for (const candidate of headShapes) {
          const score = candidate.norm - 2 * dot(candidate.shape);
          if (score < bestScore) [best, bestScore] = [candidate, score];
        }
      } else {
        // A line: the glyph whose shape correlates best (cosine), however much ink it has.
        const { inside, norm } = take(lines, col, row);
        if (inside < EMPTY * glyphs.stem * MATCH_H) continue;
        let bestScore = -Infinity;
        for (const candidate of lineShapes) {
          const score = dot(candidate.shape) / Math.sqrt(candidate.norm * norm);
          if (score > bestScore) [best, bestScore] = [candidate, score];
        }
      }
      if (!best) continue;

      const x0 = Math.floor(col * cellW);
      const x1 = Math.max(x0 + 1, Math.floor((col + 1) * cellW));
      const y0 = Math.floor(row * cellH);
      const y1 = Math.max(y0 + 1, Math.floor((row + 1) * cellH));
      let sum = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += ink[y * N + x];
      const family = familyOfGlyph.get(best.glyph);
      cells.push({
        i,
        glyph: best.glyph,
        stroke: (FAMILY_STROKE[family] ?? Stroke.None) | (KNOTS.has(family) ? CROSSING : 0),
        // Leonardo's weight: the ink, against one stroke of STROKE_PX crossing the cell.
        coverage: Math.max(
          LINE_COVERAGE,
          Math.round(255 * Math.min(1, sum / (STROKE_PX * Math.max(cellW, cellH)))),
        ),
        distance: Math.hypot((col + 0.5) * cellW - navelX, (row + 0.5) * cellH - navelY),
      });
    }
  }

  // A glyph with no glyph around it is a speck the matching found, not a stroke.
  const lit = new Uint8Array(total);
  for (const cell of cells) lit[cell.i] = 1;
  const linked = (i) => {
    const col = i % cols;
    const row = (i / cols) | 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const c = col + dx;
        const r = row + dy;
        if ((dx || dy) && c >= 0 && r >= 0 && c < cols && r < rows && lit[r * cols + c]) return true;
      }
    return false;
  };
  cells = cells.filter((cell) => linked(cell.i));

  let near = Infinity;
  let far = 0;
  for (const cell of cells) {
    near = Math.min(near, cell.distance);
    far = Math.max(far, cell.distance);
  }

  const mask = new Uint8Array(Math.ceil(total / 8));
  const coverage = new Uint8Array(cells.length);
  const dir = new Uint8Array(cells.length);
  const order = new Uint8Array(cells.length);
  const text = new Array(total).fill(" ");
  cells.forEach((cell, k) => {
    mask[cell.i >> 3] |= 1 << (cell.i & 7);
    coverage[k] = cell.coverage;
    dir[k] = cell.stroke;
    order[k] = Math.round((255 * (cell.distance - near)) / Math.max(1, far - near));
    text[cell.i] = cell.glyph;
  });

  const rowsText = [];
  for (let row = 0; row < rows; row++)
    rowsText.push(
      text
        .slice(row * cols, (row + 1) * cols)
        .join("")
        .trimEnd(),
    );

  const base64 = (bytes) => Buffer.from(bytes).toString("base64");
  return {
    cols,
    rows,
    mask: base64(mask),
    coverage: base64(coverage),
    dir: base64(dir),
    order: base64(order),
    text: rowsText.join("\n"),
  };
}

/* Main -------------------------------------------------------------------- */

async function main() {
  const config = JSON.parse(await readFile(CONFIG, "utf8"));
  const traced = await loadInk(config);
  const glyphs = await loadGlyphs();

  const debug = process.argv.indexOf("--debug");
  if (debug > 0) {
    const dir = resolve(process.argv[debug + 1]);
    await mkdir(dir, { recursive: true });
    const pixels = Buffer.from(traced.ink.map((v) => 255 - Math.round(v * 255)));
    await sharp(pixels, { raw: { width: traced.N, height: traced.N, channels: 1 } })
      .png()
      .toFile(resolve(dir, "ink.png"));
  }

  const { left, top, size } = config.crop;
  await mkdir(dirname(SCAN_OUT), { recursive: true });
  await sharp(IMAGE)
    .extract({ left, top, width: size, height: size })
    .resize(SCAN_SIZE)
    .webp({ quality: 65 })
    .toFile(SCAN_OUT);

  const data = {
    version: 1,
    source: "vitruvian-man.jpg",
    cellRatio: CELL_RATIO,
    levels: LEVELS,
    geometry: { square: config.square, circle: config.circle, navel: config.navel },
    grids: {
      desktop: sampleGrid(traced, config.colsDesktop, config, glyphs),
      mobile: sampleGrid(traced, config.colsMobile, config, glyphs),
    },
  };

  const json = `${JSON.stringify(data)}\n`;
  const bytes = Buffer.byteLength(json);
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, json);

  const { desktop, mobile } = data.grids;
  const inkCells = (grid) => Buffer.from(grid.order, "base64").length;
  console.log(
    `[drawing] ${desktop.cols}×${desktop.rows} (${inkCells(desktop)} ink) + ` +
      `${mobile.cols}×${mobile.rows} (${inkCells(mobile)} ink) → ` +
      `${(bytes / 1024).toFixed(1)} KB (budget ${BUDGET / 1024} KB)`,
  );
  if (bytes > BUDGET) {
    console.error(`[drawing] over budget by ${bytes - BUDGET} bytes`);
    process.exitCode = 1;
  }
}

await main();
