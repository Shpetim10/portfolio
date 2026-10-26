/**
 * Glyph atlas for the line-drawing tracer.  `pnpm drawing:glyphs`
 *
 * Renders every glyph of the drawing's families (src/components/drawing/model.ts
 * FAMILIES) in Martian Mono, at the exact cell the <pre> gives it: advance and
 * line height in the ratio CELL_RATIO, baseline measured the way the engine
 * measures it. Writes assets-src/vitruvian/glyphs.png (one TILE_W × TILE_H tile
 * per glyph, white on black, in FAMILIES order) and glyphs.json (the glyph
 * string and the tile size), which the tracer (trace.mjs) matches against.
 *
 * Rendered in Chromium (Playwright's, a dev dependency already) because the
 * site's text is: the tracer then chooses glyphs by the shapes the browser
 * really draws. The atlas is committed, so tracing stays byte-deterministic
 * across machines; re-run this only when FAMILIES or the font change.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { CELL_RATIO, FAMILIES } from "../../src/components/drawing/model.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const FONT = resolve(ROOT, "src/styles/fonts/martian-mono-latin-400-normal.woff2");
const PNG_OUT = resolve(ROOT, "assets-src/vitruvian/glyphs.png");
const JSON_OUT = resolve(ROOT, "assets-src/vitruvian/glyphs.json");
/** Martian Mono's advance, in em (as drawing.css --drawing-advance). */
const ADVANCE = 0.7;
/** Tile width (px); the height follows from CELL_RATIO. */
const TILE_W = 24;
const TILE_H = Math.round(TILE_W / CELL_RATIO);

async function main() {
  const glyphs = Object.values(FAMILIES).join("");
  const font = (await readFile(FONT)).toString("base64");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    await page.setContent(
      `<style>@font-face{font-family:M;src:url(data:font/woff2;base64,${font})}</style>` +
        `<pre style="margin:0;font:${TILE_W / ADVANCE}px/${TILE_H}px M">M</pre>`,
    );
    const pixels = await page.evaluate(
      async ({ glyphs, w, h }) => {
        const pre = document.querySelector("pre");
        await document.fonts.load(getComputedStyle(pre).font);
        // The engine's baseline probe: a zero-size inline-block sits on the first baseline.
        const marker = document.createElement("span");
        marker.style.cssText = "display:inline-block;width:0;height:0";
        pre.append(marker);
        const baseline = Math.round(marker.getBoundingClientRect().bottom - pre.getBoundingClientRect().top);
        const canvas = document.createElement("canvas");
        canvas.width = w * glyphs.length;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = getComputedStyle(pre).font;
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#fff";
        [...glyphs].forEach((glyph, i) => {
          // Clipped to its cell, as the engine's atlas tiles are.
          ctx.save();
          ctx.beginPath();
          ctx.rect(i * w, 0, w, h);
          ctx.clip();
          ctx.fillText(glyph, i * w, baseline);
          ctx.restore();
        });
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        return Array.from({ length: data.length / 4 }, (_, i) => data[i * 4]);
      },
      { glyphs, w: TILE_W, h: TILE_H },
    );
    const width = TILE_W * [...glyphs].length;
    await sharp(Buffer.from(pixels), { raw: { width, height: TILE_H, channels: 1 } })
      .png()
      .toFile(PNG_OUT);
    await writeFile(JSON_OUT, `${JSON.stringify({ glyphs, tileW: TILE_W, tileH: TILE_H })}\n`);
    console.log(`[drawing:glyphs] ${[...glyphs].length} glyphs, ${TILE_W}×${TILE_H} tiles → glyphs.png`);
  } finally {
    await browser.close();
  }
}

await main();
