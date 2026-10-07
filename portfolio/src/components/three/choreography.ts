import { LAYERS } from "@/components/chrome/nav";
import type { Layer } from "@/content/types";
import { H, THICKNESS, W } from "./drawing";

/*
 * T03 · The Instrument's choreography, independent of how it is drawn.
 * One normalised scroll progress (0 → 1 across the pinned hero) drives every
 * renderer — the live 3D scene, the line-drawing fallback and the labels —
 * so they can never disagree about where a part is.
 *
 * Units: "drawing units" are the isometric drawing's (src/components/three/drawing.ts).
 * The 3D model is built so its orthographic iso view lands on the drawing exactly:
 * a world unit along the screen's x axis is W / √2 drawing units.
 */

/** Scroll windows, as fractions of the pinned scroll. */
export const PHASE = {
  /** Idle pose → front three-quarter view. */
  turn: [0, 0.3],
  /** Name lines REVEAL out upward as the explode starts. */
  name: [0.16, 0.4],
  /** Parts separate along the vertical axis (EXPLODE). */
  explode: [0.24, 0.76],
  /** Labels ANNOTATE top → bottom; each part gets an equal slice. */
  annotate: [0.5, 0.8],
} as const;

/** Idle motion (design-system.md § Idle): rotation, LED breathing, pointer parallax. */
export const IDLE = {
  /** Degrees per second about the vertical axis. */
  spin: 3,
  /** LED breathing period, seconds. */
  ledCycle: 2.4,
  /** Pointer parallax ceiling, degrees. */
  tilt: 4,
} as const;

/** Camera elevation: 30° gives the drawing's 2:1 isometric. */
export const VIEW_PITCH = Math.PI / 6;
/** Final yaw: local +x to the right-front, the drawing's own angle. */
export const VIEW_YAW = -Math.PI / 4;

/** World units per drawing unit, horizontally on screen. */
export const UNIT = Math.SQRT2 / W;
/** World units of height per drawing unit of screen height (verticals foreshorten by cos 30°). */
export const UNIT_Y = UNIT / Math.cos(VIEW_PITCH);

/** Extra screen separation between consecutive plates when fully exploded. */
const SEPARATION = 2 * H + 24;

const THICK = LAYERS.map((layer) => THICKNESS[layer]);
const STACK = THICK.slice(0, -1).reduce((sum, t) => sum + t, 0);
/** Screen height of the assembled stack, and of the exploded one (drawing units). */
const ASSEMBLED_H = 2 * H + STACK + THICK[THICK.length - 1];
const EXPLODED_H = ASSEMBLED_H + (LAYERS.length - 1) * SEPARATION;
const STACK_W = 2 * W;

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Local 0 → 1 progress inside a phase window. */
export const within = (progress: number, [from, to]: readonly [number, number]) =>
  clamp01((progress - from) / (to - from));

/** Scroll progress at which a part's label annotates (top plate first). */
export const annotateAt = (index: number) =>
  PHASE.annotate[0] + (index * (PHASE.annotate[1] - PHASE.annotate[0])) / LAYERS.length;

export const thicknessOf = (layer: Layer) => THICKNESS[layer];

/**
 * Top-face centre y of each plate (drawing units, screen-down), with the stack
 * centred on 0, for an explode amount 0 (assembled) → 1 (exploded).
 * Writes into `out` (length 5) to stay allocation-free per frame.
 */
export function stack(explode: number, out: Float32Array) {
  let y = 0;
  for (let i = 0; i < THICK.length; i++) {
    out[i] = y;
    y += THICK[i] + explode * SEPARATION;
  }
  // Extent: top vertex of the first plate to the bottom vertex of the last.
  const top = -H;
  const bottom = out[THICK.length - 1] + H + THICK[THICK.length - 1];
  const centre = (top + bottom) / 2;
  for (let i = 0; i < THICK.length; i++) out[i] -= centre;
  return out;
}

/** Where the stack sits inside the figure box: px per drawing unit, and its centre in px. */
export type Framing = { scale: number; x: number; y: number };

/**
 * Assembled, the Instrument fills the figure and stands on its bottom edge
 * (the horizon). As it explodes it keeps that scale until the stack would
 * outgrow the figure, then shrinks to fit — always standing on the horizon —
 * and slides left to leave room for the labels on its right.
 */
export function frame(explode: number, width: number, height: number, compact: boolean, out: Framing) {
  const stackHeight = ASSEMBLED_H + explode * (EXPLODED_H - ASSEMBLED_H);
  const assembled = Math.min(((compact ? 0.72 : 0.62) * width) / STACK_W, (0.62 * height) / ASSEMBLED_H);

  out.scale = Math.min(assembled, (0.9 * height) / stackHeight);
  out.x = width * (0.5 + ((compact ? 0.3 : 0.34) - 0.5) * explode);
  out.y = height * 0.97 - (out.scale * stackHeight) / 2;
  return out;
}

/** Shortest signed angle from `b` to `a`, in (-π, π]. */
export const angleDelta = (a: number, b: number) => {
  const d = (a - b) % (Math.PI * 2);
  return d > Math.PI ? d - Math.PI * 2 : d <= -Math.PI ? d + Math.PI * 2 : d;
};

/**
 * State shared between the scroll choreography, the renderers and the labels.
 * Plain mutable fields: written by GSAP / input handlers, read once per tick.
 * Never React state.
 */
export type Rig = {
  /** Scroll progress through the pinned hero, 0 → 1. */
  progress: number;
  /** Eased phase amounts derived from progress (written each tick). */
  turn: number;
  explode: number;
  /** Accumulated idle rotation, radians. */
  spin: number;
  /** Pointer parallax target and current value, each axis -1 → 1. */
  pointer: { x: number; y: number };
  /** Seconds, for the LED breathing. */
  time: number;
  /** Figure box, px. */
  width: number;
  height: number;
  compact: boolean;
  framing: Framing;
  /** Top-face y per plate (drawing units), from stack(). */
  plates: Float32Array;
  /** Label anchor per plate, px in the figure box: [x0, y0, x1, y1, …]. */
  anchors: Float32Array;
};

export const createRig = (): Rig => ({
  progress: 0,
  turn: 0,
  explode: 0,
  spin: 0,
  pointer: { x: 0, y: 0 },
  time: 0,
  width: 0,
  height: 0,
  compact: false,
  framing: { scale: 1, x: 0, y: 0 },
  plates: new Float32Array(LAYERS.length),
  anchors: new Float32Array(LAYERS.length * 2),
});

/** Label anchors for the drawing: each plate's right vertex, halfway down its side. */
export function drawingAnchors(rig: Rig) {
  const { scale, x, y } = rig.framing;
  LAYERS.forEach((layer, i) => {
    rig.anchors[i * 2] = x + W * scale;
    rig.anchors[i * 2 + 1] = y + (rig.plates[i] + THICKNESS[layer] / 2) * scale;
  });
}
