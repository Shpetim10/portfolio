/**
 * BRAND-01 · Final brand files.  `pnpm brand`
 *
 * From the chosen Sh² drawing (./geometry.mjs, variant C) and the shipped
 * display face, writes
 *  - assets-src/brand/mark.svg          the mark, viewBox 0 0 32 24
 *  - assets-src/brand/mark-square.svg   the same mark centred in 0 0 32 32
 *                                       (favicon and app icons: `pnpm brand:icons`)
 *  - assets-src/brand/wordmark.svg      "SHPËTIM SHABANAJ" outlined from Big
 *                                       Shoulders Display 800, tracked 0.06em
 *  - assets-src/brand/lockup.svg        mark + wordmark, horizontal
 *  - src/components/brand/geometry.ts   the same path data for <Logo> and the
 *                                       OG cards, plus the mark's centrelines
 * Every SVG is SVGO-optimised; none embeds or references a font.
 *
 * Wordmark: glyph outlines laid out by advance + GPOS kerning + 0.06em
 * tracking, at a size where the cap height is 16 units. Ë is the font's own
 * precomposed Edieresis (its dots rise 2.86 units above the cap line), so the
 * wordmark's box is taller than its caps. The text is the owner's name from
 * src/content/profile.ts, uppercased (tests/brand.spec.ts holds them together).
 *
 * Lockup: mark height = cap height × 1.4, gap = mark height × 0.5. Optical
 * centring: the mark's ink centroid (S, h and square, measured on a raster)
 * sits on the middle of the cap height; the diacritic is ignored, as the eye
 * ignores it.
 *
 * Deterministic: the same inputs always produce byte-identical output.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";
import sharp from "sharp";
import { optimize } from "svgo";
import { CHOSEN, GRID, SIGNAL, VARIANTS } from "./geometry.mjs";

const root = new URL("../../", import.meta.url);
const OUT = new URL("assets-src/brand/", root);
const GEOMETRY = new URL("src/components/brand/geometry.ts", root);
const FONT = new URL("src/styles/fonts/og/big-shoulders-display-latin-800-normal.woff", root);

const TEXT = "SHPËTIM SHABANAJ";
const CAP = 16; // wordmark cap height, in its own units
const TRACKING = 0.06; // em
const LOCKUP_MARK = 1.4; // × cap height
const LOCKUP_GAP = 0.5; // × mark height

const round = (value, places = 3) => Number(value.toFixed(places));
const fmt = (value) => String(round(value));

const mark = VARIANTS[CHOSEN];
const body = mark.body.join("");
const exponentStyle = `fill:var(--signal,${SIGNAL})`;

/* Wordmark --------------------------------------------------------------- */

const fontFile = readFileSync(FONT);
const font = opentype.parse(
  fontFile.buffer.slice(fontFile.byteOffset, fontFile.byteOffset + fontFile.byteLength),
);
const size = (CAP * font.unitsPerEm) / font.tables.os2.sCapHeight; // font size giving a 16-unit cap
const scale = size / font.unitsPerEm;
const glyphs = font.stringToGlyphs(TEXT);
if (glyphs.some((glyph) => glyph.index === 0))
  throw new Error(`the display face is missing a glyph of "${TEXT}"`);

let x = 0;
let wordmarkD = "";
const box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
glyphs.forEach((glyph, i) => {
  const path = glyph.getPath(x, 0, size);
  const bounds = path.getBoundingBox();
  if (Number.isFinite(bounds.x1)) {
    wordmarkD += path.toPathData(3);
    box.x1 = Math.min(box.x1, bounds.x1);
    box.y1 = Math.min(box.y1, bounds.y1);
    box.x2 = Math.max(box.x2, bounds.x2);
    box.y2 = Math.max(box.y2, bounds.y2);
  }
  const next = glyphs[i + 1];
  x += glyph.advanceWidth * scale + (next ? font.getKerningValue(glyph, next) * scale + TRACKING * size : 0);
});
const wordmark = {
  x: box.x1,
  y: box.y1,
  width: box.x2 - box.x1,
  height: box.y2 - box.y1,
  diacritic: -CAP - box.y1, // how far Ë's dots rise above the cap line
};

/* Lockup ----------------------------------------------------------------- */

/** Mean y of the mark's ink, in grid units, from a 20 px-per-unit raster. */
async function inkCentroid() {
  const k = 20;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID.width} ${GRID.height}" ` +
    `width="${GRID.width * k}" height="${GRID.height * k}"><path d="${body}${mark.square}"/></svg>`;
  const { data, info } = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let weight = 0;
  for (let i = 3; i < data.length; i += 4) {
    const row = Math.floor((i - 3) / 4 / info.width);
    sum += data[i] * (row + 0.5);
    weight += data[i];
  }
  return sum / weight / k;
}

const markHeight = CAP * LOCKUP_MARK;
const k = markHeight / GRID.height;
const markTop = -CAP / 2 - (await inkCentroid()) * k; // centroid on the cap middle (baseline y = 0)
const gap = markHeight * LOCKUP_GAP;
const wordmarkShift = GRID.width * k + gap - wordmark.x; // wordmark's ink starts one gap after the mark
const lockupTop = Math.min(markTop, wordmark.y);
const lockupBottom = Math.max(markTop + markHeight, wordmark.y + wordmark.height);
const lockup = {
  width: wordmarkShift + wordmark.x + wordmark.width,
  height: lockupBottom - lockupTop,
};
const markTransform = `translate(0 ${fmt(markTop - lockupTop)}) scale(${round(k, 6)})`;
const wordTransform = `translate(${fmt(wordmarkShift)} ${fmt(-lockupTop)})`;

/* Files ------------------------------------------------------------------ */

const svg = (viewBox, title, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><title>${title}</title>${inner}</svg>`;
const markInner = `<path fill="currentColor" d="${body}"/><path style="${exponentStyle}" d="${mark.square}"/>`;

const files = {
  "mark.svg": svg(`0 0 ${GRID.width} ${GRID.height}`, "Sh²", markInner),
  "mark-square.svg": svg(
    `0 0 ${GRID.width} ${GRID.width}`,
    "Sh²",
    `<g transform="translate(0 ${(GRID.width - GRID.height) / 2})">${markInner}</g>`,
  ),
  "wordmark.svg": svg(
    `${fmt(wordmark.x)} ${fmt(wordmark.y)} ${fmt(wordmark.width)} ${fmt(wordmark.height)}`,
    TEXT,
    `<path fill="currentColor" d="${wordmarkD}"/>`,
  ),
  "lockup.svg": svg(
    `0 0 ${fmt(lockup.width)} ${fmt(lockup.height)}`,
    `Sh² ${TEXT}`,
    `<g transform="${markTransform}">${markInner}</g>` +
      `<path fill="currentColor" transform="${wordTransform}" d="${wordmarkD}"/>`,
  ),
};

/** The optimised file and its paths: the ink in order, and the exponent square (read for mark and wordmark only). */
function optimise(name, source) {
  const { data } = optimize(source, { path: name, multipass: true, floatPrecision: 3 });
  if (/<text|<style|@font-face|font-family/.test(data)) throw new Error(`${name} depends on a font`);
  const paths = [...data.matchAll(/<path([^>]*)\/>/g)].map(([, attrs]) => ({
    d: attrs.match(/\sd="([^"]+)"/)[1],
    exponent: attrs.includes("--signal"),
  }));
  return {
    data: `${data}\n`,
    ink: paths.filter((path) => !path.exponent).map((path) => path.d),
    exponent: paths.find((path) => path.exponent)?.d,
  };
}

mkdirSync(OUT, { recursive: true });
const built = {};
for (const [name, source] of Object.entries(files)) {
  built[name] = optimise(name, source);
  writeFileSync(new URL(name, OUT), built[name].data);
  console.log(`${name.padEnd(16)} ${String(Buffer.byteLength(built[name].data)).padStart(6)} B`);
}
if (Buffer.byteLength(built["mark.svg"].data) >= 2048) throw new Error("mark.svg must stay under 2KB");

const viewBoxOf = (name) => built[name].data.match(/viewBox="([^"]+)"/)[1];
const geometry = `// Generated by \`pnpm brand\` (scripts/brand/build.mjs) from scripts/brand/geometry.mjs. Do not edit.

/** The Sh² mark: S and h (currentColor), the exponent square (--signal). */
export const MARK = {
  viewBox: ${JSON.stringify(viewBoxOf("mark.svg"))},
  ink: ${JSON.stringify(built["mark.svg"].ink.join(""))},
  exponent: ${JSON.stringify(built["mark.svg"].exponent)},
  /** Stroke width in grid units. */
  stroke: ${mark.stroke},
  /** Stroke centrelines in draw order: the arc, the h stem rising, the S's squared bowl, the h's arch. */
  lines: ${JSON.stringify(mark.lines, null, 4).replace(/\n}/, "\n  }")},
} as const;

/** "${TEXT}", outlined. */
export const WORDMARK = {
  text: ${JSON.stringify(TEXT)},
  viewBox: ${JSON.stringify(viewBoxOf("wordmark.svg"))},
  ink: ${JSON.stringify(built["wordmark.svg"].ink.join(""))},
} as const;

/**
 * Mark + wordmark, placed in one box: mark height = cap height × ${LOCKUP_MARK},
 * gap = mark height × ${LOCKUP_GAP}, the mark's ink centroid on the cap middle.
 * <Logo> composes MARK and WORDMARK with these offsets (lockup.svg is the same drawing).
 */
export const LOCKUP = {
  viewBox: ${JSON.stringify(viewBoxOf("lockup.svg"))},
  mark: { y: ${fmt(markTop - lockupTop)}, scale: ${round(k, 6)} },
  wordmark: { x: ${fmt(wordmarkShift)}, y: ${fmt(-lockupTop)} },
} as const;
`;
mkdirSync(new URL(".", GEOMETRY), { recursive: true });
writeFileSync(GEOMETRY, geometry);
console.log(
  `wordmark: cap ${CAP}, Ë dots ${fmt(wordmark.diacritic)} above the cap line · ` +
    `lockup: mark ${fmt(markHeight)} tall, gap ${fmt(gap)}, ${fmt(lockup.width)} × ${fmt(lockup.height)}`,
);
