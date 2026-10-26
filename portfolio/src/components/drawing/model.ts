/*
 * T09c · Glyph line drawing — the data model shared by the build-time tracer
 * (scripts/drawing/trace.mjs imports this file directly through Node's type
 * stripping, so it stays dependency-free and uses erasable syntax only) and
 * the client renderer. One definition of the glyph sets, the stroke codes and
 * the coverage → level → alpha mapping, so the server-rendered <pre> and the
 * canvas can never disagree.
 */

/** Monospace cell width / height. Rows are derived from it so the grid keeps the image's aspect. */
export const CELL_RATIO = 0.6;

/** Alpha levels: the <pre> prints one text layer per level, the canvas draws each cell at its level's alpha. */
export const LEVELS = 8;

export type DrawingSize = "desktop" | "mobile";

/** Dominant stroke orientation of an ink cell: the low 3 bits of its `dir` byte. */
export const Stroke = { None: 0, Horizontal: 1, Vertical: 2, Slash: 3, Backslash: 4 } as const;
export type Stroke = (typeof Stroke)[keyof typeof Stroke];

/** Set in a `dir` byte when two orientations are both strong in the cell. */
export const CROSSING = 8;

/**
 * Glyphs per family. Each glyph belongs to exactly one family, so the idle
 * swap can trade a glyph for a sibling without reading the stroke data. The
 * tracer (scripts/drawing/trace.mjs) matches every cell against the first
 * glyph of each line family and every glyph of the head's; the siblings are
 * near-identical stand-ins (¦ for |, ⁄ for /, – for -) the swap alone uses.
 * The atlas the tracer matches against (assets-src/vitruvian/glyphs.png) is
 * rendered from this list: run `pnpm drawing:glyphs` after changing it.
 * Martian Mono's Latin subset has no box drawing (─ │), which would render
 * in a fallback face, off the monospace grid.
 * TODO(fonts): add "─" / "│" once Berkeley Mono (which covers them) is licensed.
 */
export const FAMILIES = {
  vertical: "|¦",
  slash: "/⁄",
  backslash: "\\",
  dash: "-–",
  low: "_",
  high: "¯",
  left: "(",
  right: ")",
  tick: "'`",
  point: ",.",
  wave: "~",
  dots: ":·",
  cross: "+x*",
  dense: "#%&@",
} as const;
export type Family = keyof typeof FAMILIES;

/** The family string a glyph belongs to ("" for a space or an unknown glyph). */
export function familyOf(glyph: string): string {
  for (const glyphs of Object.values(FAMILIES)) if (glyphs.includes(glyph)) return glyphs;
  return "";
}

/** Alpha level 0 (faintest) … LEVELS − 1 of an ink cell's coverage (0–255). */
export function levelOf(coverage: number): number {
  return Math.min(LEVELS - 1, Math.max(0, Math.floor((coverage * LEVELS) / 256)));
}

/**
 * Glyph alpha per level: 0.3 + 0.7 × (coverage / 255), taken at the level's
 * centre coverage. Quantised to the level so the <pre> (one layer per level)
 * and the canvas draw every cell at exactly the same alpha.
 */
export function levelAlpha(level: number): number {
  const coverage = ((level + 0.5) * 256) / LEVELS;
  return 0.3 + 0.7 * Math.min(1, coverage / 255);
}

export type DrawingGrid = {
  cols: number;
  rows: number;
  /** base64 bitset, cols × rows, row-major, LSB first: 1 = an ink cell of the figure. */
  mask: string;
  /** base64 Uint8Array, one byte per ink cell (row-major order): ink coverage 0–255. */
  coverage: string;
  /** base64 Uint8Array, one byte per ink cell: Stroke, | CROSSING where two orientations are strong. */
  dir: string;
  /** base64 Uint8Array, one byte per ink cell: distance from the navel, normalised 0–255. */
  order: string;
  /** The final glyph grid, rows joined by "\n", spaces off the figure. */
  text: string;
};

/** Leonardo's construction, normalised to the traced image (0–1, origin top-left). */
export type DrawingGeometry = {
  square: { x: number; y: number; size: number };
  circle: { cx: number; cy: number; r: number };
  navel: { x: number; y: number };
};

export type DrawingData = {
  version: 1;
  source: string;
  cellRatio: number;
  levels: number;
  geometry: DrawingGeometry;
  grids: Record<DrawingSize, DrawingGrid>;
};

export type DrawingPoint = { x: number; y: number };

/** Annotation targets on Leonardo's construction (GlyphLineDrawing reports them in container pixels). */
export type DrawingAnchors = {
  squareTopRight: DrawingPoint;
  squareTopCenter: DrawingPoint;
  /** The circle's lower-left point, 45° below its horizontal diameter. */
  circleBottomLeft: DrawingPoint;
  circleBottomCenter: DrawingPoint;
  navel: DrawingPoint;
};

/**
 * The anchors, normalised (0–1 of the drawing's box). Shared by onLayout and
 * by server-rendered annotations, which place them as percentages of the box.
 */
export function anchorsOf({ square, circle, navel }: DrawingGeometry): DrawingAnchors {
  const diagonal = circle.r * Math.SQRT1_2;
  return {
    squareTopRight: { x: square.x + square.size, y: square.y },
    squareTopCenter: { x: square.x + square.size / 2, y: square.y },
    circleBottomLeft: { x: circle.cx - diagonal, y: circle.cy + diagonal },
    circleBottomCenter: { x: circle.cx, y: circle.cy + circle.r },
    navel: { x: navel.x, y: navel.y },
  };
}
