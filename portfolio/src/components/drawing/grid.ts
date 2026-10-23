import { bit, decodeBytes } from "@/components/sculpture/model";
import { LEVELS, levelAlpha, levelOf, type DrawingGrid } from "./model";

/*
 * T09c · Decoding a traced grid. Server and client alike: the server prints
 * the final layers into the <pre>, the engine animates the same ink cells.
 */

/** The ink cells of a grid, in row-major order (structure of arrays). */
export type InkCells = {
  count: number;
  /** Cell index (row × cols + col) of each ink cell. */
  index: Uint32Array;
  coverage: Uint8Array;
  dir: Uint8Array;
  order: Uint8Array;
};

export function inkCellsOf(grid: DrawingGrid): InkCells {
  const mask = decodeBytes(grid.mask);
  const coverage = decodeBytes(grid.coverage);
  const index = new Uint32Array(coverage.length);
  let k = 0;
  for (let i = 0; i < grid.cols * grid.rows && k < index.length; i++) if (bit(mask, i)) index[k++] = i;
  return {
    count: coverage.length,
    index,
    coverage,
    dir: decodeBytes(grid.dir),
    order: decodeBytes(grid.order),
  };
}

/** One text layer of the final grid: the glyphs of one alpha level, spaces elsewhere. */
export type DrawingLayer = { level: number; alpha: number; text: string };

/**
 * The final grid split into one text layer per alpha level, so each level gets
 * its own opacity without a span per glyph. Stacked, they read as one grid —
 * exactly the canvas's final frame.
 */
export function layersOf(grid: DrawingGrid): DrawingLayer[] {
  const cells = inkCellsOf(grid);
  const levelAt = new Int8Array(grid.cols * grid.rows).fill(-1);
  for (let k = 0; k < cells.count; k++) levelAt[cells.index[k]] = levelOf(cells.coverage[k]);

  const lines = grid.text.split("\n");
  const layers: string[][] = Array.from({ length: LEVELS }, () => []);
  for (let row = 0; row < grid.rows; row++) {
    const line = lines[row] ?? "";
    const perLevel = layers.map(() => "");
    for (let col = 0; col < line.length; col++) {
      const level = levelAt[row * grid.cols + col];
      for (let l = 0; l < LEVELS; l++) perLevel[l] += l === level ? line[col] : " ";
    }
    perLevel.forEach((text, l) => layers[l].push(text.trimEnd()));
  }
  return layers
    .map((rows, level) => ({ level, alpha: levelAlpha(level), text: rows.join("\n") }))
    .filter((layer) => layer.text.trim());
}
