import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getProject, getProjectSlugs, isTodo } from "@/content";

/*
 * T07 · Open Graph card per case study, rendered once at build into
 * /work/<slug>/og.png (a static GET handler, like the metadata image routes,
 * but with an extension: the bare `opengraph-image` file convention exports
 * without one, and static hosts then serve it untyped). page.tsx links it.
 * A drawing sheet: registration marks, part number with the one signal dot,
 * the title in the display face, a title block of the facts that are known.
 * Unsupplied facts are left off the card (the page marks them TODO); a
 * project without a title shows its part number.
 * Colours are read from src/styles/tokens.css, so the card can't drift from
 * the site. Fonts are the shipped OFL faces as WOFF (the renderer has no WOFF2).
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "Case study title card: part number, title and project facts";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

const root = process.cwd();
const fonts = Promise.all([
  readFile(join(root, "src/styles/fonts/og/big-shoulders-display-latin-800-normal.woff")),
  readFile(join(root, "src/styles/fonts/og/martian-mono-latin-400-normal.woff")),
]);

/** --color-* tokens from tokens.css, e.g. { carbon: "#0b0a08", … } (hex values only). */
const colors = readFile(join(root, "src/styles/tokens.css"), "utf8").then((css) =>
  Object.fromEntries(
    [...css.matchAll(/--color-([a-z]+):\s*(#[0-9a-f]{3,8})\s*;/gi)].map(([, name, value]) => [name, value]),
  ),
);

// Card geometry, px of the 1200 × 630 image.
const MARGIN = 56;
const MARK = 24;
const DOT = 14;

export async function GET(_request: Request, { params }: RouteContext<"/work/[slug]/og.png">) {
  const project = getProject((await params).slug)!;
  const [[display, mono], color] = await Promise.all([fonts, colors]);
  const hairline = `1px solid ${color.dust}`;

  const titled = !isTodo(project.title);
  const facts = [
    ["Role", project.role],
    ["Duration", project.duration],
    ["Year", project.year > 0 ? String(project.year) : ""],
  ].filter(([, value]) => value && !isTodo(value));

  const label = {
    fontFamily: "Mono",
    fontSize: 18,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  } as const;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: MARGIN,
        backgroundColor: color.carbon,
        color: color.bone,
        position: "relative",
      }}
    >
      {[
        { top: MARGIN / 2, left: MARGIN / 2 },
        { top: MARGIN / 2, right: MARGIN / 2 },
        { bottom: MARGIN / 2, left: MARGIN / 2 },
        { bottom: MARGIN / 2, right: MARGIN / 2 },
      ].map((corner, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: MARK,
            height: MARK,
            display: "flex",
            opacity: 0.4,
            ...corner,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: MARK / 2,
              top: 0,
              width: 1,
              height: MARK,
              backgroundColor: color.dust,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: MARK / 2,
              left: 0,
              height: 1,
              width: MARK,
              backgroundColor: color.dust,
            }}
          />
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 20, color: color.dust, ...label }}>
        <div style={{ width: DOT, height: DOT, borderRadius: DOT, backgroundColor: color.signal }} />
        <span style={{ color: color.bone }}>{project.partNumber}</span>
        <span>Case study</span>
        <div style={{ flexGrow: 1, height: 1, backgroundColor: color.dust, opacity: 0.4 }} />
      </div>

      <div
        style={{
          display: "flex",
          fontFamily: "Display",
          fontSize: titled ? 128 : 220,
          lineHeight: 0.88,
          textTransform: "uppercase",
          maxWidth: OG_SIZE.width - MARGIN * 2,
        }}
      >
        {titled ? project.title : project.partNumber}
      </div>

      <div style={{ display: "flex", minHeight: 80, borderTop: hairline, ...label }}>
        {facts.map(([term, value], i) => (
          <div
            key={term}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: "20px 24px 0",
              paddingLeft: i === 0 ? 0 : 24,
              borderLeft: i === 0 ? "none" : hairline,
            }}
          >
            <span style={{ color: color.dust, fontSize: 14 }}>{term}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: "Display", data: display, weight: 800, style: "normal" },
        { name: "Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
