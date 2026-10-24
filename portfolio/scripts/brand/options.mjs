/**
 * BRAND-01 · Sh² option drawings.  `pnpm brand:options`
 *
 * Writes assets-src/brand/options/sh2-{a,b,c}.svg from the construction in
 * ./geometry.mjs, for the /lab/logo bench. C was kept (geometry.mjs CHOSEN);
 * `pnpm brand` builds the final files from it.
 *
 * The S and h use currentColor; the square uses var(--signal) with the signal
 * hex as fallback, for use as an <img> where no custom property exists.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { SIGNAL, VARIANTS } from "./geometry.mjs";

const OUT = new URL("../../assets-src/brand/options/", import.meta.url);
const TITLES = { a: "Sh² · A · ligature", b: "Sh² · B · ligature, bold", c: "Sh² · C · separate" };

mkdirSync(OUT, { recursive: true });
for (const [id, { body, square }] of Object.entries(VARIANTS)) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 24">` +
    `<title>${TITLES[id]}</title>` +
    `<path fill="currentColor" d="${body.join("")}"/>` +
    `<path data-exponent="" style="fill:var(--signal,${SIGNAL})" d="${square}"/>` +
    `</svg>\n`;
  writeFileSync(new URL(`sh2-${id}.svg`, OUT), svg);
  console.log(`sh2-${id}.svg  ${svg.length} B`);
}
