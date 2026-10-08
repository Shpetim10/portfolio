import { LAYERS } from "@/components/chrome/nav";
import { createRig, drawingAnchors, frame, stack } from "./choreography";
import { body, DETAIL, face, LED_FACE, silhouette, THICKNESS } from "./drawing";

/*
 * The Instrument as an isometric line drawing. Three jobs:
 *   static   the exploded render (reduced motion, no JS): server-rendered
 *            into a fixed STATIC_BOX reference frame, labels placed in %.
 *   drawing  the low-tier renderer: the hero scrubs plate transforms on it
 *            with the same choreography as the 3D scene.
 *   poster   what the high / mid tiers show until the 3D scene is ready.
 * With `lit`, each plate carries a second, coolant stroke that a section can
 * crossfade in (opacity) to light that part — the stack's bill of materials.
 * Each plate is drawn at y = 0 and positioned by a transform, so the explode
 * only ever writes transforms. Plates paint base first: an upper plate's
 * carbon silhouette hides the face it rests on.
 */

/** Reference frame of the static render (px); the static figure has this aspect ratio. */
export const STATIC_BOX = { width: 400, height: 500 } as const;

const rig = createRig();
rig.width = STATIC_BOX.width;
rig.height = STATIC_BOX.height;
stack(1, rig.plates);
frame(1, rig.width, rig.height, true, rig.framing);
drawingAnchors(rig);

const fixed = (n: number) => Math.round(n * 100) / 100;

/** Static label anchors, as % of the static figure. */
export const STATIC_ANCHORS = LAYERS.map((_, i) => ({
  x: `${fixed((rig.anchors[i * 2] / STATIC_BOX.width) * 100)}%`,
  y: `${fixed((rig.anchors[i * 2 + 1] / STATIC_BOX.height) * 100)}%`,
}));

const STATIC_ASSEMBLY = `translate(${fixed(rig.framing.x)} ${fixed(rig.framing.y)}) scale(${fixed(rig.framing.scale)})`;
const [LED_X, LED_Y] = face(0, LED_FACE.u, LED_FACE.v);
const PAINT_ORDER = [...LAYERS].reverse();

export function InstrumentDrawing({ lit = false }: { lit?: boolean }) {
  return (
    <svg
      className="instrument-drawing"
      viewBox={`0 0 ${STATIC_BOX.width} ${STATIC_BOX.height}`}
      data-part="drawing"
      aria-hidden="true"
      focusable="false"
    >
      <g data-part="assembly" transform={STATIC_ASSEMBLY}>
        {PAINT_ORDER.map((layer) => {
          const t = THICKNESS[layer];
          const i = LAYERS.indexOf(layer);
          const lines = body(0, t) + DETAIL[layer](0);
          return (
            <g
              key={layer}
              className="instrument-drawing__plate"
              data-layer={layer}
              transform={`translate(0 ${fixed(rig.plates[i])})`}
            >
              <path className="instrument-drawing__fill" d={silhouette(0, t)} />
              <path className="instrument-drawing__line" d={lines} vectorEffect="non-scaling-stroke" />
              {lit && (
                <path
                  className="instrument-drawing__line instrument-drawing__line--lit"
                  d={lines}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {layer === "interface" && (
                <circle className="instrument-drawing__led" cx={LED_X} cy={LED_Y} r={2.5} />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
