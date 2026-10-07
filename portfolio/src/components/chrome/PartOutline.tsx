import type { Layer } from "@/content/types";
import { body, DETAIL, face, H, LED_FACE, silhouette, THICKNESS } from "@/components/three/drawing";
import { LAYER_NAMES, LAYERS, partNumber } from "./nav";

/*
 * Line drawing of the Instrument, exploded along its vertical axis: five
 * isometric plates, top (Interface) to base (Infrastructure), each with the
 * engraved detail that identifies it. All parts sit in dust; the active part
 * is redrawn in bone with its part label beside it, the others step back.
 * Pure opacity crossfades (src/styles/chrome.css). Decorative: the menu link
 * that drives it already names the part in text.
 */

const VIEW_W = 200;
const VIEW_H = 600;
const CX = VIEW_W / 2;
const GAP = 28; // exploded spacing between plates

type Plate = { layer: Layer; y: number; t: number };

const PLATES: Plate[] = LAYERS.reduce<Plate[]>((plates, layer) => {
  const previous = plates.at(-1);
  const y = previous ? previous.y + H + previous.t + GAP + H : H + 8;
  return [...plates, { layer, y, t: THICKNESS[layer] }];
}, []);

const [LED_X, LED_Y] = face(PLATES[0].y, LED_FACE.u, LED_FACE.v);

export function PartOutline({ active }: { active: Layer | null }) {
  return (
    <div className="part-outline" data-active={active ?? undefined} aria-hidden="true">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="part-outline__drawing" focusable="false">
        {/* Centre line through the assembly, hidden behind each plate. */}
        <path className="part-outline__axis" d={`M${CX},0V${VIEW_H}`} vectorEffect="non-scaling-stroke" />
        <g transform={`translate(${CX} 0)`}>
          {PLATES.map((plate) => (
            <g
              key={plate.layer}
              className="part-outline__part"
              data-layer={plate.layer}
              data-active={plate.layer === active || undefined}
            >
              <path className="part-outline__fill" d={silhouette(plate.y, plate.t)} />
              <path
                className="part-outline__line"
                d={body(plate.y, plate.t) + DETAIL[plate.layer](plate.y)}
                vectorEffect="non-scaling-stroke"
              />
              <path
                className="part-outline__line part-outline__line--active"
                d={body(plate.y, plate.t) + DETAIL[plate.layer](plate.y)}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
          <circle className="part-outline__led" cx={LED_X} cy={LED_Y} r={2} />
        </g>
      </svg>
      {PLATES.map(({ layer, y, t }) => (
        <span
          key={layer}
          className="part-outline__label part-label"
          data-layer={layer}
          data-active={layer === active || undefined}
          style={{ top: `${((y + t / 2) / VIEW_H) * 100}%` }}
        >
          <span className="part-label__number">{partNumber(layer)}</span> — {LAYER_NAMES[layer]}
        </span>
      ))}
    </div>
  );
}
