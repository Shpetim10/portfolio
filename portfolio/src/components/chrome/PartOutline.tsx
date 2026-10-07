import type { Layer } from "@/content/types";
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
const W = 80; // half-width of a plate's top face
const H = 40; // half-depth (2:1 isometric)
const GAP = 28; // exploded spacing between plates

/** Plate thickness grows toward the base. */
const THICKNESS: Record<Layer, number> = {
  interface: 6,
  api: 10,
  services: 14,
  data: 18,
  infrastructure: 22,
};

const r = (n: number) => Math.round(n * 100) / 100;

type Plate = { layer: Layer; y: number; t: number };

const PLATES: Plate[] = LAYERS.reduce<Plate[]>((plates, layer) => {
  const previous = plates.at(-1);
  const y = previous ? previous.y + H + previous.t + GAP + H : H + 8;
  return [...plates, { layer, y, t: THICKNESS[layer] }];
}, []);

/** A point on a plate's top face: u, v ∈ [-1, 1] (u → right-back, v → left-front). */
const face = (y: number, u: number, v: number): [number, number] => [
  r(CX + ((u - v) * W) / 2),
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

const silhouette = ({ y, t }: Plate) =>
  `M${CX - W},${y}L${CX},${y - H}L${CX + W},${y}V${y + t}L${CX},${y + H + t}L${CX - W},${y + t}Z`;

const body = ({ y, t }: Plate) =>
  `${rhombus(y, 0, 0, 1)}M${CX - W},${y}V${y + t}L${CX},${y + H + t}L${CX + W},${y + t}V${y}M${CX},${y + H}V${y + H + t}`;

/** The engraved detail that tells the parts apart. */
const DETAIL: Record<Layer, (y: number) => string> = {
  // Display window.
  interface: (y) => rhombus(y, 0, 0, 0.6),
  // A row of port slots along the back edge.
  api: (y) => [-0.6, -0.2, 0.2, 0.6].map((v) => `M${face(y, 0.55, v)}L${face(y, 0.85, v)}`).join(""),
  // Four service modules.
  services: (y) =>
    [
      [-0.45, -0.45],
      [0.45, -0.45],
      [-0.45, 0.45],
      [0.45, 0.45],
    ]
      .map(([u, v]) => rhombus(y, u, v, 0.3))
      .join(""),
  // Storage platter.
  data: (y) => ring(y, 0, 0, 0.8) + ring(y, 0, 0, 0.45) + ring(y, 0, 0, 0.08),
  // Mounting frame with corner bolts.
  infrastructure: (y) =>
    rhombus(y, 0, 0, 0.85) +
    [
      [-0.72, -0.72],
      [0.72, -0.72],
      [-0.72, 0.72],
      [0.72, 0.72],
    ]
      .map(([u, v]) => ring(y, u, v, 0.08))
      .join(""),
};

const [LED_X, LED_Y] = face(PLATES[0].y, 0.78, 0.78);

export function PartOutline({ active }: { active: Layer | null }) {
  return (
    <div className="part-outline" data-active={active ?? undefined} aria-hidden="true">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="part-outline__drawing" focusable="false">
        {/* Centre line through the assembly, hidden behind each plate. */}
        <path className="part-outline__axis" d={`M${CX},0V${VIEW_H}`} vectorEffect="non-scaling-stroke" />
        {PLATES.map((plate) => (
          <g
            key={plate.layer}
            className="part-outline__part"
            data-layer={plate.layer}
            data-active={plate.layer === active || undefined}
          >
            <path className="part-outline__fill" d={silhouette(plate)} />
            <path
              className="part-outline__line"
              d={body(plate) + DETAIL[plate.layer](plate.y)}
              vectorEffect="non-scaling-stroke"
            />
            <path
              className="part-outline__line part-outline__line--active"
              d={body(plate) + DETAIL[plate.layer](plate.y)}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        <circle className="part-outline__led" cx={LED_X} cy={LED_Y} r={2} />
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
