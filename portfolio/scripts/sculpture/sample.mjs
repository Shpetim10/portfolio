/**
 * T04b · Build-time sculpture sampler.  `pnpm sculpture`
 *
 * Reads assets-src/victory/victory-base.png and its config.json, and writes
 * src/content/sculpture/victory.json: per grid size (desktop / mobile) the
 * gamma-corrected luminance, the figure mask, the formation order and the FINAL
 * glyph grid as text for the server-rendered <pre>.
 *
 *  - Rows come from the image aspect and the monospace cell ratio (CELL_RATIO).
 *  - Each cell is the box average of the source pixels it covers.
 *  - Order = distance from the core point (in image pixels, so it is round, not
 *    stretched by the cell shape), normalised 0–1 across the figure cells.
 *  - Glyphs are ranked by ink coverage in Martian Mono (rendered with sharp from
 *    the self-hosted face), bucketed by density level and picked with a fixed seed.
 *
 * Deterministic: the same inputs always produce byte-identical output.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CELL_RATIO,
  GLYPHS,
  LEVELS,
  bucketsOf,
  levelOf,
  mulberry32,
} from "../../src/components/sculpture/model.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const SOURCE_DIR = resolve(ROOT, "assets-src/victory");
const IMAGE = resolve(SOURCE_DIR, "victory-base.png");
const CONFIG = resolve(SOURCE_DIR, "config.json");
const FONT = resolve(ROOT, "src/styles/fonts/martian-mono-latin-400-normal.woff2");
const OUT = resolve(ROOT, "src/content/sculpture/victory.json");
const BUDGET = 40 * 1024;
const SEED = 0x7a11;

// sharp's bundled fontconfig looks for a system config; an empty one keeps it quiet.
// The face itself is registered per call via `fontfile`.
process.env.FONTCONFIG_FILE ??= resolve(HERE, "fonts.conf");
const { default: sharp } = await import("sharp");

/** Ink coverage of each glyph in Martian Mono → GLYPHS ranked sparse → dense. */
async function rankGlyphs() {
  const escape = (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[ch] ?? ch;
  const ink = new Map();
  for (const ch of GLYPHS) {
    const { data } = await sharp({
      text: {
        text: `<span foreground="white">${escape(ch)}</span>`,
        font: "Martian Mono 128",
        fontfile: FONT,
        dpi: 72,
        rgba: true,
      },
    })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) sum += data[i];
    ink.set(ch, sum);
  }
  // Ties (none expected) fall back to GLYPHS order so the ranking stays stable.
  return [...GLYPHS].sort((a, b) => ink.get(a) - ink.get(b) || GLYPHS.indexOf(a) - GLYPHS.indexOf(b));
}

function sampleGrid({ pixels, width, height }, cols, config, buckets) {
  const rows = Math.round((height * cols * CELL_RATIO) / width);
  const cells = cols * rows;
  const lum = new Uint8Array(cells);
  const mask = new Uint8Array(Math.ceil(cells / 8));
  const order = new Uint8Array(cells);
  const distance = new Float64Array(cells);
  const coreX = config.core.x * width;
  const coreY = config.core.y * height;
  let near = Infinity;
  let far = 0;

  for (let row = 0; row < rows; row++) {
    const y0 = Math.floor((row * height) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((row + 1) * height) / rows));
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor((col * width) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((col + 1) * width) / cols));
      let sum = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += pixels[y * width + x];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      const i = row * cols + col;
      lum[i] = Math.round(255 * (mean / 255) ** config.gamma);
      if (lum[i] <= config.threshold) continue;

      mask[i >> 3] |= 1 << (i & 7);
      distance[i] = Math.hypot(((col + 0.5) * width) / cols - coreX, ((row + 0.5) * height) / rows - coreY);
      near = Math.min(near, distance[i]);
      far = Math.max(far, distance[i]);
    }
  }

  const random = mulberry32(SEED);
  const lines = [];
  for (let row = 0; row < rows; row++) {
    let line = "";
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      if (!((mask[i >> 3] >> (i & 7)) & 1)) {
        line += " ";
        continue;
      }
      order[i] = Math.round((255 * (distance[i] - near)) / Math.max(1, far - near));
      const bucket = buckets[levelOf(lum[i], config.threshold)];
      line += bucket[Math.floor(random() * bucket.length)];
    }
    lines.push(line.trimEnd());
  }

  const base64 = (bytes) => Buffer.from(bytes).toString("base64");
  return {
    cols,
    rows,
    lum: base64(lum),
    mask: base64(mask),
    order: base64(order),
    text: lines.join("\n"),
  };
}

async function main() {
  const config = JSON.parse(await readFile(CONFIG, "utf8"));
  const { data: pixels, info } = await sharp(IMAGE).greyscale().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 1) throw new Error(`expected 1 channel, got ${info.channels}`);
  const image = { pixels, width: info.width, height: info.height };

  const ranked = await rankGlyphs();
  const buckets = bucketsOf(ranked);

  const data = {
    version: 1,
    source: "victory-base.png",
    cellRatio: CELL_RATIO,
    levels: LEVELS,
    core: config.core,
    windFrom: config.windFrom,
    threshold: config.threshold,
    gamma: config.gamma,
    glyphs: ranked.join(""),
    grids: {
      desktop: sampleGrid(image, config.colsDesktop, config, buckets),
      mobile: sampleGrid(image, config.colsMobile, config, buckets),
    },
  };

  const json = `${JSON.stringify(data)}\n`;
  const bytes = Buffer.byteLength(json);
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, json);

  const { desktop, mobile } = data.grids;
  console.log(
    `[sculpture] ${desktop.cols}×${desktop.rows} + ${mobile.cols}×${mobile.rows} → ` +
      `${(bytes / 1024).toFixed(1)} KB (budget ${BUDGET / 1024} KB)\n` +
      `[sculpture] glyphs sparse → dense: ${data.glyphs}`,
  );
  if (bytes > BUDGET) {
    console.error(`[sculpture] over budget by ${bytes - BUDGET} bytes`);
    process.exitCode = 1;
  }
}

await main();
