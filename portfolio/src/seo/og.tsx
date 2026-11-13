import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { MARK as SH2 } from "@/components/brand/geometry";
import { COLORS as color } from "./site";

/*
 * T07 / T15 · The Open Graph cards' shared drawing sheet: a carbon ground,
 * registration marks in the corners, a header rule led by the Sh² mark (its
 * exponent square is the card's one signal accent) and a title block of facts.
 * Rendered at build by next/og (Satori: every multi-child div is flex).
 * Colours come from tokens.css; fonts are the shipped OFL faces as WOFF
 * (the renderer has no WOFF2).
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const MARGIN = 56;
const MARK = 24;
const LOGO = 30; // Sh² mark height

const root = process.cwd();
const fontFiles = Promise.all([
  readFile(join(root, "src/styles/fonts/og/big-shoulders-display-latin-800-normal.woff")),
  readFile(join(root, "src/styles/fonts/og/martian-mono-latin-400-normal.woff")),
]);

/** ImageResponse options: the card size and its two faces ("Display", "Mono"). */
export async function ogOptions() {
  const [display, mono] = await fontFiles;
  return {
    ...OG_SIZE,
    fonts: [
      { name: "Display", data: display, weight: 800 as const, style: "normal" as const },
      { name: "Mono", data: mono, weight: 400 as const, style: "normal" as const },
    ],
  };
}

/** A /public image as a data URL the renderer can embed. */
export async function publicImage(src: string, type: string): Promise<string> {
  const data = await readFile(join(root, "public", src));
  return `data:${type};base64,${data.toString("base64")}`;
}

export { color };
export const hairline = `1px solid ${color.dust}`;

export const label = {
  fontFamily: "Mono",
  fontSize: 18,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
} as const;

const CORNERS = [
  { top: MARGIN / 2, left: MARGIN / 2 },
  { top: MARGIN / 2, right: MARGIN / 2 },
  { bottom: MARGIN / 2, left: MARGIN / 2 },
  { bottom: MARGIN / 2, right: MARGIN / 2 },
];

/** The sheet: carbon ground, padding, registration marks. Children lay out in a column. */
export function Sheet({ children }: { children: ReactNode }) {
  return (
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
      {CORNERS.map((corner, i) => (
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
      {children}
    </div>
  );
}

/** Mark, then the lead label in bone and the rest in dust, then a rule to the edge. */
export function SheetHeader({ lead, rest = [] }: { lead: string; rest?: string[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, color: color.dust, ...label }}>
      <svg viewBox={SH2.viewBox} height={LOGO} width={(LOGO * 32) / 24}>
        <path d={SH2.ink} fill={color.bone} />
        <path d={SH2.exponent} fill={color.signal} />
      </svg>
      <span style={{ color: color.bone }}>{lead}</span>
      {rest.map((text) => (
        <span key={text}>{text}</span>
      ))}
      <div style={{ flexGrow: 1, height: 1, backgroundColor: color.dust, opacity: 0.4 }} />
    </div>
  );
}

/** The title block: a hairline, then one cell per fact (term over value). */
export function TitleBlock({ facts }: { facts: [term: string, value: string][] }) {
  return (
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
  );
}
