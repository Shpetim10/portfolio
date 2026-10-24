/**
 * BRAND-01 · App icons from assets-src/brand/mark-square.svg.  `pnpm brand:icons`
 *
 * Writes the Next.js icon files (app/favicon.ico, app/icon.svg, app/apple-icon.png):
 *  - icon.svg       the square mark on a carbon tile: bone S and h, signal square.
 *                   A tab can be light or dark, and a currentColor mark would
 *                   vanish on one of them, so the tile carries its own ground.
 *  - favicon.ico    the same tile at 16, 32 and 48 px (PNG entries), for
 *                   browsers that skip the SVG.
 *  - apple-icon.png 180 px with a margin of a quarter of the side, since iOS
 *                   masks the corners of a home-screen icon.
 * Colours come from src/styles/tokens.css. Run `pnpm brand` first when the mark changes.
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { optimize } from "svgo";

const root = new URL("../../", import.meta.url);
const SOURCE = new URL("assets-src/brand/mark-square.svg", root);
const APP = new URL("src/app/", root);

const tokens = readFileSync(new URL("src/styles/tokens.css", root), "utf8");
const color = (name) => tokens.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i"))[1];
const [carbon, bone, signal] = ["carbon", "bone", "signal"].map(color);

const source = readFileSync(SOURCE, "utf8");
const inner = source
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "")
  .replace(/<title>[\s\S]*?<\/title>/, "")
  .replaceAll("currentColor", bone)
  .replace(/style="fill:var\(--signal,#[0-9a-f]+\)"/i, `fill="${signal}"`);
if (/currentColor|var\(/.test(inner))
  throw new Error("mark-square.svg has a colour the tile doesn't resolve");

/** The 32 × 32 mark on a carbon ground, the mark inset by `margin` units on every side. */
const tile = (margin = 0) => {
  const side = 32 + 2 * margin;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-margin} ${-margin} ${side} ${side}">` +
    `<rect x="${-margin}" y="${-margin}" width="${side}" height="${side}" fill="${carbon}"/>${inner}</svg>`
  );
};

const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: (72 * size) / 32 })
    .resize(size, size)
    .png()
    .toBuffer();

/** ICO container with PNG entries (Vista+ and every current browser read these). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry); // width
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1); // height
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

const svgIcon = optimize(tile(), { multipass: true }).data;
writeFileSync(new URL("icon.svg", APP), `${svgIcon}\n`);

const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(async (size) => ({ size, data: await png(tile(), size) })));
writeFileSync(new URL("favicon.ico", APP), ico(images));

writeFileSync(new URL("apple-icon.png", APP), await png(tile(8), 180));

console.log(`icon.svg ${svgIcon.length} B · favicon.ico ${sizes.join("/")} px · apple-icon.png 180 px`);
