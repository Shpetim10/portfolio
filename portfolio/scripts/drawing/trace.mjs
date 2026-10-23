/**
 * T09c · Build-time tracer for the glyph line drawing.  `pnpm drawing`
 *
 * Reads assets-src/vitruvian/vitruvian-man.png and its config.json, and writes
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
 *     `exclude` rects (handwriting inside the circle). Hysteresis keeps only
 *     ink connected to a dark core (SEED); specks under MIN_EXTENT px go.
 *  4. Per cell (monospace ratio CELL_RATIO): ink coverage, normalised to one
 *     stroke of STROKE_PX crossing the cell, and the stroke orientation from a
 *     Sobel gradient, measured in cell space so diagonal runs of glyphs connect.
 *  5. Formation order = distance from the navel (in image pixels, so it is
 *     round, not stretched by the cell shape), normalised 0–1 across ink cells.
 *
 * Deterministic: the same inputs always produce byte-identical output.
 * `--debug <dir>` also writes the traced ink mask there as ink.png.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CELL_RATIO, CROSSING, LEVELS, Stroke } from "../../src/components/drawing/model.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const SOURCE_DIR = resolve(ROOT, "assets-src/vitruvian");
const IMAGE = resolve(SOURCE_DIR, "vitruvian-man.png");
const CONFIG = resolve(SOURCE_DIR, "config.json");
const OUT = resolve(ROOT, "src/content/drawing/vitruvian.json");
const SCAN_OUT = resolve(ROOT, "public/assets/lab/vitruvian-scan.webp");
const BUDGET = 30 * 1024;

/** Max-filter width (px) that erases a stroke from the background estimate. */
const BG_DILATE = 7;
/** Blur (σ, px) of the background estimate: smooth enough to keep stains, not strokes. */
const BG_SIGMA = 12;
/** Percentile of darkness inside the traced region taken as "full ink". */
const INK_REF_PERCENTILE = 0.995;
/** Hysteresis: an ink component is kept only if some pixel of it reaches this share of full ink. */
const SEED = 0.7;
/** Ink components spanning fewer px than this (either axis) are paper grain or dust, not strokes. */
const MIN_EXTENT = 12;
/**
 * Hatching: a pixel of a short near-horizontal stroke (horizontal run under
 * HATCH_LENGTH px) with HATCH_BANDS or more separate ink bands within
 * ±HATCH_REACH px above and below.
 */
const HATCH_BANDS = 3;
const HATCH_REACH = 10;
const HATCH_LENGTH = 32;
/** Width (px, at the scan's resolution) of one of Leonardo's strokes: one stroke across a cell = full coverage. */
const STROKE_PX = 2.2;
/** Cells with less coverage stay empty. */
const MIN_COVERAGE = 48;
/** Below this coverage a cell with no clear direction is drawn as a faint dot. */
const FAINT_COVERAGE = 110;
/** Perpendicular second orientation at least this share of the first → crossing. */
const CROSS_RATIO = 0.7;
/** A cell this dense with no clear direction is a knot of strokes. */
const DENSE_COVERAGE = 180;
/** Orientation coherence (0 = isotropic, 1 = one direction) below which a cell has no clear stroke. */
const LOOSE = 0.22;

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
  return { N, dark, ink };
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
  const run = (x, y, dx, dy) => {
    let length = 1;
    for (const s of [-1, 1]) {
      for (let k = 1; ; k++) {
        const nx = x + s * k * dx;
        const ny = y + s * k * dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || !ink[ny * N + nx]) break;
        length++;
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
      let bands = 0;
      let inside = false;
      for (let k = Math.max(0, y - HATCH_REACH), end = Math.min(N - 1, y + HATCH_REACH); k <= end; k++) {
        const on = ink[k * N + x] > 0;
        if (on && !inside) bands++;
        inside = on;
      }
      if (bands >= HATCH_BANDS) hatch.push(y * N + x);
    }
  }
  for (const i of hatch) ink[i] = 0;
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
 * a lone dash (≤ 4 px tall, shorter than HATCH_LENGTH) is a hatching leftover.
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
    const dash = height <= 4 && width < HATCH_LENGTH;
    if (peak < SEED || Math.max(width, height) < MIN_EXTENT || dash) for (const i of component) ink[i] = 0;
  }
}

/* Grid -------------------------------------------------------------------- */

/** Orientation bins, in cell space: 0 horizontal, 1 "\" (right and down), 2 vertical, 3 "/". */
const BIN_STROKE = [Stroke.Horizontal, Stroke.Backslash, Stroke.Vertical, Stroke.Slash];

function sampleGrid({ N, dark, ink }, cols, config) {
  const rows = Math.round(cols * CELL_RATIO);
  const cellW = N / cols;
  const cellH = N / rows;
  const navelX = config.navel.x * N;
  const navelY = config.navel.y * N;

  const cells = [];
  for (let row = 0; row < rows; row++) {
    const y0 = Math.floor(row * cellH);
    const y1 = Math.max(y0 + 1, Math.floor((row + 1) * cellH));
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor(col * cellW);
      const x1 = Math.max(x0 + 1, Math.floor((col + 1) * cellW));

      let sum = 0;
      let sumY = 0;
      const bins = [0, 0, 0, 0];
      let jxx = 0;
      let jyy = 0;
      let jxy = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * N + x;
          sum += ink[i];
          sumY += ink[i] * (y - y0 + 0.5);
          // Gradients peak on a stroke's edges, just off its ink: take them within 1 px of ink.
          if (!nearInk(ink, N, x, y) || x < 1 || y < 1 || x >= N - 1 || y >= N - 1) continue;
          const d = (dx, dy) => dark[(y + dy) * N + x + dx];
          const gx = d(1, -1) + 2 * d(1, 0) + d(1, 1) - d(-1, -1) - 2 * d(-1, 0) - d(-1, 1);
          const gy = d(-1, 1) + 2 * d(0, 1) + d(1, 1) - d(-1, -1) - 2 * d(0, -1) - d(1, -1);
          // Stroke direction ⟂ gradient, measured in cells: (−gy, gx) / (cellW, cellH).
          const sx = -gy / cellW;
          const sy = gx / cellH;
          const m = sx * sx + sy * sy;
          if (!m) continue;
          let angle = Math.atan2(sy, sx);
          if (angle < 0) angle += Math.PI;
          bins[Math.round(angle / (Math.PI / 4)) % 4] += m;
          jxx += sx * sx;
          jyy += sy * sy;
          jxy += sx * sy;
        }
      }
      if (!sum) continue;

      const ranked = [0, 1, 2, 3].sort((a, b) => bins[b] - bins[a] || a - b);
      const [first, second] = ranked;
      const trace = jxx + jyy;
      const coherence = trace ? Math.hypot(jxx - jyy, 2 * jxy) / trace : 0;
      const stroke = BIN_STROKE[first];
      // Ink one stroke would leave crossing this cell in its own direction.
      const length =
        stroke === Stroke.Horizontal ? cellW : stroke === Stroke.Vertical ? cellH : Math.hypot(cellW, cellH);
      const coverage = Math.round(255 * Math.min(1, sum / (STROKE_PX * length)));
      if (coverage < MIN_COVERAGE) continue;

      // Two strokes crossing: the runner-up orientation is perpendicular and nearly as strong.
      // (Neighbouring orientations are both strong on any curve, which is no crossing.)
      const crossing =
        Math.abs(first - second) === 2 && bins[first] > 0 && bins[second] >= CROSS_RATIO * bins[first];
      cells.push({
        i: row * cols + col,
        coverage,
        stroke,
        first,
        crossing,
        coherence,
        /** Ink centroid within the cell, 0 (top) – 1 (bottom). */
        low: sumY / sum / (y1 - y0),
        distance: Math.hypot((col + 0.5) * cellW - navelX, (row + 0.5) * cellH - navelY),
      });
    }
  }

  let near = Infinity;
  let far = 0;
  for (const cell of cells) {
    near = Math.min(near, cell.distance);
    far = Math.max(far, cell.distance);
  }

  const total = cols * rows;
  const mask = new Uint8Array(Math.ceil(total / 8));
  const coverage = new Uint8Array(cells.length);
  const dir = new Uint8Array(cells.length);
  const order = new Uint8Array(cells.length);
  const glyphs = new Array(total).fill(" ");
  cells.forEach((cell, k) => {
    mask[cell.i >> 3] |= 1 << (cell.i & 7);
    coverage[k] = cell.coverage;
    dir[k] = cell.stroke | (cell.crossing ? CROSSING : 0);
    order[k] = Math.round((255 * (cell.distance - near)) / Math.max(1, far - near));
    glyphs[cell.i] = glyphOf(cell);
  });

  const lines = [];
  for (let row = 0; row < rows; row++)
    lines.push(
      glyphs
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
    text: lines.join("\n"),
  };
}

const nearInk = (ink, N, x, y) => {
  for (let dy = -1; dy <= 1; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= N) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      if (nx >= 0 && nx < N && ink[ny * N + nx]) return true;
    }
  }
  return false;
};

/**
 * The glyph that follows the cell's stroke. Families from model.ts FAMILIES;
 * within a family the choice reads the ink (weight, position in the cell).
 */
function glyphOf({ coverage, stroke, first, crossing, coherence, low }) {
  if (coherence < LOOSE && coverage < FAINT_COVERAGE)
    return low > 0.62 ? "." : stroke === Stroke.Vertical ? ":" : "·";
  // Knotted ink with no direction (hair, the features of the face).
  if (coherence < LOOSE && coverage >= 250) return "#";
  if (crossing) return first % 2 === 0 ? "+" : "x";
  if (coherence < LOOSE && coverage >= DENSE_COVERAGE) return "*";
  switch (stroke) {
    case Stroke.Horizontal:
      if (low > 0.66) return "_";
      return coherence < 0.5 ? "~" : "-";
    case Stroke.Vertical:
      return coverage >= 150 ? "|" : coverage >= 90 ? "¦" : "!";
    case Stroke.Slash:
      return coverage >= 120 ? "/" : "⁄";
    default:
      return "\\";
  }
}

/* Main -------------------------------------------------------------------- */

async function main() {
  const config = JSON.parse(await readFile(CONFIG, "utf8"));
  const traced = await loadInk(config);

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
  await sharp(IMAGE).extract({ left, top, width: size, height: size }).webp({ quality: 65 }).toFile(SCAN_OUT);

  const data = {
    version: 1,
    source: "vitruvian-man.png",
    cellRatio: CELL_RATIO,
    levels: LEVELS,
    geometry: { square: config.square, circle: config.circle, navel: config.navel },
    grids: {
      desktop: sampleGrid(traced, config.colsDesktop, config),
      mobile: sampleGrid(traced, config.colsMobile, config),
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
