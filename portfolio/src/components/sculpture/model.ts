/*
 * T04b · Symbol sculpture — the data model shared by the build-time sampler
 * (scripts/sculpture/sample.mjs imports this file directly through Node's type
 * stripping, so it stays dependency-free and uses erasable syntax only) and
 * the client renderer. One definition of the glyph set, the density levels and
 * the luminance → level → alpha mapping, so the server-rendered <pre> and the
 * canvas can never disagree.
 */

/**
 * Code symbols, unordered. The task also lists λ Σ Δ, but Martian Mono has no
 * Greek (or ∆ ∑) at all, so they would render in a fallback face — off the
 * design system and off the monospace grid.
 * TODO(fonts): add "λΣΔ" back once Berkeley Mono (which covers them) is licensed.
 */
export const GLYPHS = ".,:;'-_=+<>/\\|()[]{}*#%&@01";

/** Density buckets: glyph ink coverage and figure luminance both split into this many levels. */
export const LEVELS = 8;

/** Monospace cell width / height. Rows are derived from it so the grid keeps the image's aspect. */
export const CELL_RATIO = 0.6;

export type SculptureSize = "desktop" | "mobile";
export type WindFrom = "left" | "right";

export type SculptureGrid = {
  cols: number;
  rows: number;
  /** base64 Uint8Array, cols × rows, row-major: gamma-corrected luminance 0–255. */
  lum: string;
  /** base64 bitset, cols × rows, row-major, LSB first: 1 = figure (lum > threshold). */
  mask: string;
  /**
   * base64 Uint8Array, cols × rows: formation order 0–255 (distance from the core,
   * normalised across the figure; torso ≈ 0, wingtips and drapery ≈ 255). 0 off the figure.
   */
  order: string;
  /** The final glyph grid, rows joined by "\n", spaces off the figure (fixed seed). */
  text: string;
};

export type SculptureData = {
  version: 1;
  source: string;
  cellRatio: number;
  levels: number;
  /** Normalised torso centre the formation order radiates from. */
  core: { x: number; y: number };
  /** The side the figure faces; arrivals come from here, releases blow away from it. */
  windFrom: WindFrom;
  threshold: number;
  gamma: number;
  /** Build-time ink ranking of GLYPHS, sparse → dense (the client re-measures on mount). */
  glyphs: string;
  grids: Record<SculptureSize, SculptureGrid>;
};

/** Density level 0 (faintest) … LEVELS − 1 of a figure cell's luminance. */
export function levelOf(lum: number, threshold: number): number {
  const level = Math.floor(((lum - threshold - 1) * LEVELS) / (255 - threshold));
  return Math.min(LEVELS - 1, Math.max(0, level));
}

/**
 * Glyph alpha per level: 0.25 + 0.75 × (luminance / 255), taken at the level's
 * centre luminance. Quantised to the level so the <pre> (one layer per level)
 * and the canvas draw every cell at exactly the same alpha.
 */
export function levelAlpha(level: number, threshold: number): number {
  const lum = threshold + 1 + ((level + 0.5) * (255 - threshold)) / LEVELS;
  return 0.25 + 0.75 * (lum / 255);
}

/** One text layer of the final grid: the glyphs of one density level, spaces elsewhere. */
export type SculptureLayer = { level: number; alpha: number; text: string };

/**
 * The final glyph grid, ready to print: everything the static <pre> needs and
 * nothing the animation does. Lets a server render the figure without
 * shipping the sampled data to the client up front.
 */
export type SculptureStill = {
  cols: number;
  rows: number;
  cellRatio: number;
  layers: SculptureLayer[];
};

/**
 * The final grid split into one text layer per density level, so each level
 * gets its own alpha without a span per glyph. Stacked, they read as one grid
 * — exactly the canvas's final frame.
 */
export function layersOf(grid: SculptureGrid, threshold: number): SculptureLayer[] {
  const lum = decodeBytes(grid.lum);
  const mask = decodeBytes(grid.mask);
  const lines = grid.text.split("\n");
  const rows: string[][] = Array.from({ length: LEVELS }, () => []);
  for (let row = 0; row < grid.rows; row++) {
    const line = lines[row] ?? "";
    const perLevel = rows.map(() => "");
    for (let col = 0; col < line.length; col++) {
      const i = row * grid.cols + col;
      const level = bit(mask, i) ? levelOf(lum[i], threshold) : -1;
      for (let l = 0; l < LEVELS; l++) perLevel[l] += l === level ? line[col] : " ";
    }
    perLevel.forEach((text, l) => rows[l].push(text.trimEnd()));
  }
  return rows
    .map((lines, level) => ({ level, alpha: levelAlpha(level, threshold), text: lines.join("\n") }))
    .filter((layer) => layer.text.trim());
}

/** The still of one grid size. */
export function stillOf(data: SculptureData, size: SculptureSize): SculptureStill {
  const grid = data.grids[size];
  return {
    cols: grid.cols,
    rows: grid.rows,
    cellRatio: data.cellRatio,
    layers: layersOf(grid, data.threshold),
  };
}

/** Splits a sparse → dense ranking into LEVELS buckets of near-equal size. */
export function bucketsOf<T>(ranked: readonly T[]): T[][] {
  return Array.from({ length: LEVELS }, (_, level) =>
    ranked.slice(
      Math.floor((level * ranked.length) / LEVELS),
      Math.floor(((level + 1) * ranked.length) / LEVELS),
    ),
  );
}

/** base64 → bytes, on the server (Node) and in the browser alike. */
export function decodeBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Reads bit `i` of a LSB-first bitset. */
export const bit = (bits: Uint8Array, i: number): boolean => ((bits[i >> 3] >> (i & 7)) & 1) === 1;

/** Deterministic PRNG (mulberry32): the sampler's fixed seed and the client's noise share it. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
