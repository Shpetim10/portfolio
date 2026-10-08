import { STATIC_BOX } from "@/components/three/InstrumentDrawing";
import { LABEL_AT, MISSING_LABEL, SLOT } from "./slot";

/*
 * The dimension line on the missing part's slot, in the drawing's frame:
 * extension lines from the slot's top and bottom vertices out to a vertical
 * rule with oblique end ticks, and a leader from the rule to a signal dot at
 * the empty centre. NotFoundStage moves the three groups (transforms only) as
 * the 3D part turns; the rest is static.
 */

/** Gap between the part and an extension line, and the extension past the rule (viewBox units). */
const GAP = 4;
const OVERSHOOT = 6;
/** Half-size of an oblique end tick. */
const TICK = 4;

const tick = (y: number) => `M${SLOT.rule - TICK},${y + TICK}L${SLOT.rule + TICK},${y - TICK}`;
const extension = (y: number) => `M${SLOT.axis + GAP},${y}H${SLOT.rule + OVERSHOOT}`;

const pct = (n: number, of: number) => `${Math.round((n / of) * 10000) / 100}%`;

export function SlotAnnotation() {
  return (
    <div className="pnf__annotation">
      <svg
        className="pnf__marks"
        viewBox={`0 0 ${STATIC_BOX.width} ${STATIC_BOX.height}`}
        aria-hidden="true"
        focusable="false"
      >
        <g data-slot="top">
          <path d={extension(SLOT.top) + tick(SLOT.top)} vectorEffect="non-scaling-stroke" />
        </g>
        <g data-slot="bottom">
          <path d={extension(SLOT.bottom) + tick(SLOT.bottom)} vectorEffect="non-scaling-stroke" />
        </g>
        <g data-slot="rule">
          <path d={`M${SLOT.rule},${SLOT.top}V${SLOT.bottom}`} vectorEffect="non-scaling-stroke" />
        </g>
        <path
          className="pnf__leader"
          d={`M${SLOT.rule},${SLOT.centre}H${SLOT.axis}`}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className="pnf__dot"
        style={{ left: pct(SLOT.axis, STATIC_BOX.width), top: pct(SLOT.centre, STATIC_BOX.height) }}
        aria-hidden="true"
      />
      <p className="pnf__callout" style={{ left: LABEL_AT.x, top: LABEL_AT.y }} aria-hidden="true">
        <span className="pnf__callout-part">{MISSING_LABEL}</span>
        <span className="pnf__callout-status">Not found</span>
      </p>
    </div>
  );
}
