/**
 * BRAND-01 · Sh² construction, shared by `pnpm brand:options` and `pnpm brand`.
 *
 * Grid: 32 × 24 units, baseline at y = 24, h ascender and exponent square top
 * at y = 0. Every outline vertex, radius and centre lands on the half-unit grid
 * (n() refuses anything else).
 *
 * S (shared by all three variants):
 *  - upper bowl: a true circular arc of 270°, from a terminal at 3 o'clock over
 *    the top to 6 o'clock (theory). Terminals sit only at cardinal points, so
 *    each cut is horizontal or vertical and stays on the grid;
 *  - spine: leaves 6 o'clock horizontally, tangent to the arc;
 *  - lower bowl: straight segments at right angles, ending in a square
 *    bottom-left terminal (practice). It runs 1.5 units further left than the
 *    circle, so the S is wider at the foot and does not sit top-heavy.
 *  - cap height 20 (y 4 → 24), so the h ascender clears it by 4 units.
 *
 * h: stem, squared shoulder, leg. Exponent square: top on the ascender line,
 * 1.5 units right of the h. Each mark is centred on the 32-unit width.
 *
 * Variants
 *  A · ligature, stroke 2.5: the arc's 3 o'clock end runs straight up as the
 *      ascender (tangent there), and the lower bowl's right side is the h's
 *      stem below. The S keeps its opening as the gap between the terminal and
 *      the spine; the shoulder springs above that gap so it never closes it.
 *  B · ligature, stroke 3, square 4 (A's is 3.5).
 *  C · separate, stroke 2.5, S and h 1.5 units apart. The chosen mark.
 *
 * Paths are filled outlines (no strokes, no text). Overlapping parts of a
 * ligature are separate subpaths wound the same way, so nonzero fills their
 * union. Each variant also carries the centrelines of its strokes, which the
 * header's draw-on mask traces (src/components/brand/Logo.tsx).
 */

export const GRID = { width: 32, height: 24 };
const BASE = GRID.height;
const GAP = 1.5;

export const n = (value) => {
  if ((value * 2) % 1 !== 0) throw new Error(`${value} is off the half-unit grid`);
  return String(value);
};

/** Centreline coordinates fall on the quarter-unit grid (a 2.5 stroke's half-width). */
const c = (value) => {
  if ((value * 4) % 1 !== 0) throw new Error(`${value} is off the quarter-unit grid`);
  return String(value);
};

/** Rectangle wound like the S outline (ink on the left of travel), so overlaps union. */
const rect = (x0, y0, x1, y1) => `M${n(x0)} ${n(y0)}V${n(y1)}H${n(x1)}V${n(y0)}Z`;

/** S: outer arc 3 → 12 → 9 → 6 o'clock, spine and square lower bowl, back by the inner arc. */
function S({ x, top, r, w, foot }) {
  const xL = x;
  const cx = x + foot + r;
  const cy = top + r;
  const xR = cx + r;
  const ri = r - w;
  const rc = r - w / 2;
  return {
    xR,
    cy,
    d:
      `M${n(xR)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx)} ${n(cy + r)}` +
      `H${n(xR - w)}V${n(BASE - w)}H${n(xL)}V${n(BASE)}H${n(xR)}V${n(cy + ri)}H${n(cx)}` +
      `A${n(ri)} ${n(ri)} 0 1 1 ${n(cx + ri)} ${n(cy)}Z`,
    // Centrelines: the arc from its terminal, then the spine and lower bowl from 6 o'clock.
    arc: `M${c(cx + rc)} ${c(cy)}A${c(rc)} ${c(rc)} 0 1 0 ${c(cx)} ${c(cy + rc)}`,
    bowl: `M${c(cx)} ${c(cy + rc)}H${c(xR - w / 2)}V${c(BASE - w / 2)}H${c(xL)}`,
  };
}

/** h with a squared shoulder: stem from `top` to the baseline, shoulder band at `shoulder`, leg ending at `xr`. */
const h = ({ x, top, shoulder, xr, w }) =>
  `M${n(x)} ${n(top)}V${n(BASE)}H${n(x + w)}V${n(shoulder + w)}H${n(xr - w)}V${n(BASE)}` +
  `H${n(xr)}V${n(shoulder)}H${n(x + w)}V${n(top)}Z`;

const S_SHAPE = { top: 4, r: 6, foot: 1.5 };

function ligature({ w, counter, shoulder, square }) {
  const width = S_SHAPE.foot + 2 * S_SHAPE.r + counter + w + GAP + square;
  const x = (GRID.width - width) / 2;
  const s = S({ x, w, ...S_SHAPE });
  const stem = s.xR - w; // the lower bowl's right side, continued up
  const legR = s.xR + counter + w;
  const sq = legR + GAP;
  if (shoulder + w > s.cy) throw new Error("the shoulder would close the S's opening");
  return {
    stroke: w,
    body: [
      s.d,
      rect(stem, 0, s.xR, s.cy), // ascender: the arc's 3 o'clock end, straight up
      // Shoulder + leg off the shared stem; no stem of its own, which would close the S's opening.
      `M${n(stem)} ${n(shoulder)}V${n(shoulder + w)}H${n(legR - w)}V${n(BASE)}H${n(legR)}V${n(shoulder)}Z`,
    ],
    square: rect(sq, 0, sq + square, square),
  };
}

function separate({ w, counter, shoulder, square }) {
  const width = S_SHAPE.foot + 2 * S_SHAPE.r + GAP + w + counter + w + GAP + square;
  const x = (GRID.width - width) / 2;
  const s = S({ x, w, ...S_SHAPE });
  const hx = s.xR + GAP;
  const legR = hx + w + counter + w;
  const sq = legR + GAP;
  const sy = shoulder + w / 2;
  return {
    stroke: w,
    body: [s.d, h({ x: hx, top: 0, shoulder, xr: legR, w })],
    square: rect(sq, 0, sq + square, square),
    // Draw order (header motion): the arc; the stem, rising; the squared strokes.
    lines: {
      arc: s.arc,
      stem: `M${c(hx + w / 2)} ${c(BASE)}V0`,
      bowl: s.bowl,
      arch: `M${c(hx + w)} ${c(sy)}H${c(legR - w / 2)}V${c(BASE)}`,
    },
  };
}

export const VARIANTS = {
  a: ligature({ w: 2.5, counter: 7, shoulder: 7.5, square: 3.5 }),
  b: ligature({ w: 3, counter: 7, shoulder: 7, square: 4 }),
  c: separate({ w: 2.5, counter: 7, shoulder: 7.5, square: 3.5 }),
};

/** BRAND-01 step 3: the owner kept C. */
export const CHOSEN = "c";

export const SIGNAL = "#ff4f00"; // --color-signal, for files used as <img> (no custom properties there)
