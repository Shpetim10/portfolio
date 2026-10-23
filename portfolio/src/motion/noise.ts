/*
 * Smooth value noise in [0, 1], for the ragged formation fronts of the glyph
 * figures (SymbolSculpture, GlyphLineDrawing). Deterministic: the same cell
 * always gets the same value, so a scrub back and forth retraces its steps.
 */

const hash = (x: number, y: number) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * sx;
  const bottom = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * sx;
  return top + (bottom - top) * sy;
}

/** Two octaves, scaled to the grid so the front is equally ragged at both sizes. */
export function frontNoise(col: number, row: number, cols: number): number {
  const scale = 14 / cols;
  return (
    0.65 * valueNoise(col * scale, row * scale) + 0.35 * valueNoise(col * scale * 2.7 + 31, row * scale * 2.7)
  );
}
