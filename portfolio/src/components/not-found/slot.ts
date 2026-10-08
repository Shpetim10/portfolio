import { LAYERS, LAYER_NAMES, partNumber } from "@/components/chrome/nav";
import { createRig, frame, stack, type Framing } from "@/components/three/choreography";
import { H, THICKNESS, W } from "@/components/three/drawing";
import { STATIC_BOX } from "@/components/three/InstrumentDrawing";
import type { Layer } from "@/content/types";

/*
 * T14 · Where the missing part should sit. The 404 draws the Instrument
 * exploded, as the hero leaves it, with one plate gone: the drawing shows it in
 * phantom lines and a dimension line measures the empty slot.
 *
 * Everything here is in the static drawing's frame (STATIC_BOX, the figure's
 * viewBox): the drawing, the annotation overlay and — scaled to the canvas —
 * the 3D render all share it, so they line up.
 *
 * The slot's envelope is the plate's projected height: top vertex to bottom
 * vertex. Seen from the iso view it is 2H + t; as the 3D model turns about its
 * vertical axis the top face's corners swing nearer the horizon and the
 * envelope shrinks, to 2H/√2 + t face-on, around the same centre. The overlay
 * follows with transforms only.
 */

/** The part that isn't there: the middle plate, so the gap reads from both neighbours. */
export const MISSING: Layer = "services";
export const MISSING_LABEL = `${partNumber(MISSING)} — ${LAYER_NAMES[MISSING]}`;

const index = LAYERS.indexOf(MISSING);
const t = THICKNESS[MISSING];

const plates = stack(1, createRig().plates);
/** The static figure's framing, exploded (as InstrumentDrawing renders it). */
export const FRAMING: Readonly<Framing> = frame(1, STATIC_BOX.width, STATIC_BOX.height, true, {
  scale: 1,
  x: 0,
  y: 0,
});

/** Clearance between the stack's widest reach (±W at any yaw) and the dimension line, drawing units. */
const CLEARANCE = 28;

const fixed = (n: number) => Math.round(n * 100) / 100;
const px = (y: number) => fixed(FRAMING.y + y * FRAMING.scale);

/** Half the envelope above the slot's centre line, drawing units, for a yaw away from the iso view. */
export const envelopeHalf = (yaw: number) =>
  ((Math.abs(Math.cos(yaw + Math.PI / 4)) + Math.abs(Math.sin(yaw + Math.PI / 4))) * H) / Math.SQRT2 + t / 2;

/** Slot geometry in the figure's viewBox units. */
export const SLOT = {
  /** The stack's vertical axis. */
  axis: fixed(FRAMING.x),
  /** Centre of the slot (yaw-invariant): the leader's target. */
  centre: px(plates[index] + t / 2),
  /** Iso-view envelope ends. */
  top: px(plates[index] - H),
  bottom: px(plates[index] + H + t),
  /** The dimension line, clear of the stack at any yaw. */
  rule: fixed(FRAMING.x + (W + CLEARANCE) * FRAMING.scale),
  /** viewBox units per drawing unit. */
  scale: FRAMING.scale,
} as const;

/** Where the overlay's HTML label starts, as % of the figure (just right of the dimension line). */
export const LABEL_AT = {
  x: `${fixed(((SLOT.rule + 10) / STATIC_BOX.width) * 100)}%`,
  y: `${fixed((SLOT.centre / STATIC_BOX.height) * 100)}%`,
} as const;
