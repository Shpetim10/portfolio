/**
 * T08b · Build-time icon sprite for the Stack assembly line.  `pnpm stack:icons`
 *
 * Reads every brand mark named in src/content/skills.ts (Skill.icon) from the npm
 * packages and writes ONE sprite, src/components/sections/stack/sprite.json:
 * a <symbol> per icon, inlined once into the page and drawn with <use>, so the
 * conveyor makes no icon requests at all.
 *
 *  - simple-icons  node_modules/simple-icons/icons/<slug>.svg            (24 × 24)
 *  - devicon       node_modules/devicon/icons/<slug>/<slug>-plain.svg   (128 × 128, single colour)
 *  - monogram      not in the sprite: drawn as text on a hairline tile in the page
 *
 * Every fill, stroke, class and style is stripped and the symbol fills with
 * currentColor, so no brand colour can reach the page. The viewBox is
 * normalised: a square centred on the artwork's own ink bounds (measured by
 * rasterising it), so a 24-unit Simple Icon and a padded 128-unit Devicon
 * mark carry the same visual weight at the same size.
 *
 * A slug that doesn't resolve fails the script (and so the build): a missing
 * file is never swapped for a look-alike. Deterministic output.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { optimize } from "svgo";
import { skills } from "../../src/content/skills.ts";

const root = new URL("../../", import.meta.url);
const OUT = new URL("src/components/sections/stack/sprite.json", root);
/** Uncompressed ceiling for the inline sprite (T08b performance budget). */
const BUDGET = 60 * 1024;
/** Raster size for measuring ink bounds: 1 px ≈ 0.4% of the icon. */
const PROBE = 256;

const sourceFile = ({ source, slug }) =>
  source === "simple-icons"
    ? new URL(`node_modules/simple-icons/icons/${slug}.svg`, root)
    : new URL(`node_modules/devicon/icons/${slug}/${slug}-plain.svg`, root);

/** Symbol id for an icon: "si-react", "di-java". Mirrored in AssemblyLine (iconId). */
const idOf = ({ source, slug }) => `${source === "simple-icons" ? "si" : "di"}-${slug}`;

const clean = (svg) =>
  optimize(svg, {
    multipass: true,
    floatPrecision: 2,
    plugins: [
      "preset-default",
      { name: "removeAttrs", params: { attrs: ["fill", "stroke", "class", "style", "role"] } },
      "removeTitle",
      "removeDimensions",
    ],
  }).data;

/** The square, in source units, around the artwork's ink. */
async function inkBox(svg, [vx, vy, vw, vh]) {
  // White ink flattened onto black: trim then compares colour against an explicit
  // background, so a mark that fills its own corner (the JavaScript tile) still measures.
  const ink = Buffer.from(svg.replace("<svg", '<svg fill="#fff"'));
  const density = (72 * PROBE) / Math.max(vw, vh);
  const { data, info } = await sharp(ink, { density })
    .flatten({ background: "#000" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -1, -1];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < 8) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) throw new Error("[stack:icons] an icon rendered empty");
  const scale = info.width / vw;
  const x = vx + minX / scale;
  const y = vy + minY / scale;
  const w = (maxX - minX + 1) / scale;
  const h = (maxY - minY + 1) / scale;
  const side = Math.max(w, h);
  const round = (n) => Math.round(n * 100) / 100;
  return [round(x - (side - w) / 2), round(y - (side - h) / 2), round(side), round(side)];
}

const icons = new Map();
for (const skill of skills) {
  if (!skill.icon || skill.icon.source === "monogram") continue;
  icons.set(idOf(skill.icon), skill.icon);
}

const symbols = [];
for (const [id, icon] of [...icons].sort(([a], [b]) => a.localeCompare(b))) {
  let raw;
  try {
    raw = await readFile(sourceFile(icon), "utf8");
  } catch {
    throw new Error(
      `[stack:icons] no ${icon.source} icon "${icon.slug}" (${fileURLToPath(sourceFile(icon))})`,
    );
  }
  const svg = clean(raw);
  const viewBox = svg
    .match(/viewBox="([^"]+)"/)?.[1]
    .split(/[\s,]+/)
    .map(Number);
  if (!viewBox || viewBox.length !== 4) throw new Error(`[stack:icons] ${id} has no viewBox`);
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  if (/<(image|linearGradient|radialGradient|style|script)\b/.test(inner)) {
    throw new Error(`[stack:icons] ${id} isn't a plain single-colour mark`);
  }
  const box = await inkBox(svg, viewBox);
  symbols.push(`<symbol id="${id}" viewBox="${box.join(" ")}">${inner}</symbol>`);
}

const sprite = symbols.join("");
const bytes = Buffer.byteLength(sprite);
if (bytes > BUDGET) throw new Error(`[stack:icons] sprite is ${bytes} B, over the ${BUDGET} B budget`);

await writeFile(OUT, `${JSON.stringify({ ids: [...icons.keys()].sort(), symbols: sprite }, null, 2)}\n`);
console.log(
  `[stack:icons] ${symbols.length} symbols, ${(bytes / 1024).toFixed(1)} KB → ${fileURLToPath(OUT)}`,
);
