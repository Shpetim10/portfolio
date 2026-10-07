import type { Layer } from "@/content/types";

/*
 * Line-drawing geometry of the Instrument, shared by the menu's part outline
 * (T02), the hero drawing (T03) and — through choreography.ts — the 3D model,
 * so all three agree on proportions.
 *
 * Five square plates in 2:1 isometric, drawn around x = 0. A plate is drawn
 * with its top-face centre at `y`; its body hangs `t` units below that.
 * Face coordinates u, v ∈ [-1, 1]: u runs to the right-front, v to the left-front.
 */

/** Half-width of a plate's top face. */
export const W = 80;
/** Half-depth of a plate's top face (2:1 isometric). */
export const H = 40;

/** Plate thickness grows toward the base. */
export const THICKNESS: Record<Layer, number> = {
  interface: 6,
  api: 10,
  services: 14,
  data: 18,
  infrastructure: 22,
};

/** The indicator light's spot on the Interface plate, in face coordinates. */
export const LED_FACE = { u: 0.78, v: 0.78 } as const;

const r = (n: number) => Math.round(n * 100) / 100;

/** A point on a plate's top face. */
export const face = (y: number, u: number, v: number): [number, number] => [
  r(((u - v) * W) / 2),
  r(y + ((u + v) * H) / 2),
];

const rhombus = (y: number, cu: number, cv: number, s: number) => {
  const [a, b, c, d] = [
    face(y, cu - s, cv + s),
    face(y, cu - s, cv - s),
    face(y, cu + s, cv - s),
    face(y, cu + s, cv + s),
  ];
  return `M${a}L${b}L${c}L${d}Z`;
};

/** A circle on the top face, which projects to an ellipse. */
const ring = (y: number, cu: number, cv: number, radius: number) => {
  const [x, cy] = face(y, cu, cv);
  const rx = r(radius * W * Math.SQRT1_2);
  const ry = r(radius * H * Math.SQRT1_2);
  return `M${r(x - rx)},${cy}a${rx},${ry} 0 1,0 ${r(rx * 2)},0a${rx},${ry} 0 1,0 ${r(-rx * 2)},0`;
};

/** Outer outline of a plate, for the carbon fill that hides whatever sits behind it. */
export const silhouette = (y: number, t: number) =>
  `M${-W},${y}L0,${y - H}L${W},${y}V${y + t}L0,${y + H + t}L${-W},${y + t}Z`;

/** Top face, the two visible sides and the front edge. */
export const body = (y: number, t: number) =>
  `${rhombus(y, 0, 0, 1)}M${-W},${y}V${y + t}L0,${y + H + t}L${W},${y + t}V${y}M0,${y + H}V${y + H + t}`;

const SERVICE_MODULES = [
  [-0.45, -0.45],
  [0.45, -0.45],
  [-0.45, 0.45],
  [0.45, 0.45],
] as const;

const BOLTS = [
  [-0.72, -0.72],
  [0.72, -0.72],
  [-0.72, 0.72],
  [0.72, 0.72],
] as const;

/**
 * The engraved detail that tells the parts apart, as face coordinates.
 * The 3D model builds the same features from these numbers.
 */
export const FEATURES = {
  /** Display window: a square inset, half-size. */
  window: 0.6,
  /** Port slots along the right-front edge: v of each slot, and its u span. */
  ports: { v: [-0.6, -0.2, 0.2, 0.6], u: [0.55, 0.85] },
  /** Four service modules: centres and half-size. */
  modules: { at: SERVICE_MODULES, size: 0.3 },
  /** Storage platter: concentric rings (radii). */
  platter: [0.8, 0.45, 0.08],
  /** Mounting frame (half-size) and corner bolts (centres, radius). */
  frame: 0.85,
  bolts: { at: BOLTS, radius: 0.08 },
} as const;

/** SVG path of each plate's engraved detail, drawn on the top face at `y`. */
export const DETAIL: Record<Layer, (y: number) => string> = {
  interface: (y) => rhombus(y, 0, 0, FEATURES.window),
  api: (y) =>
    FEATURES.ports.v
      .map((v) => `M${face(y, FEATURES.ports.u[0], v)}L${face(y, FEATURES.ports.u[1], v)}`)
      .join(""),
  services: (y) => FEATURES.modules.at.map(([u, v]) => rhombus(y, u, v, FEATURES.modules.size)).join(""),
  data: (y) => FEATURES.platter.map((radius) => ring(y, 0, 0, radius)).join(""),
  infrastructure: (y) =>
    rhombus(y, 0, 0, FEATURES.frame) +
    FEATURES.bolts.at.map(([u, v]) => ring(y, u, v, FEATURES.bolts.radius)).join(""),
};
