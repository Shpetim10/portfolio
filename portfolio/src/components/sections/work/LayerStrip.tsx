import { LAYER_NAMES, LAYERS, partNumber } from "@/components/chrome/nav";
import { body, DETAIL, H, silhouette, THICKNESS, W } from "@/components/three/drawing";
import { cx } from "@/components/ui/cx";
import type { Layer } from "@/content";

/*
 * The Instrument laid out flat: its five plates side by side on one axis, in
 * assembly order, each drawn with the engraved detail that identifies it
 * (src/components/three/drawing.ts — the same geometry as the hero and the menu).
 * The plates a project touches are lit: redrawn in coolant (diagram lines),
 * label in bone; the rest stay dust. Lighting is a pure opacity crossfade
 * between the two strokes, so the work track can switch it every frame.
 *
 *   full    the track's assembly diagram (desktop): plate + part label
 *   inline  inside a card (mobile / static): plate + part number only
 *
 * Decorative: every panel names its layers in text (its tags).
 */

const PAD = 4;
const T_MAX = THICKNESS.infrastructure;
const VIEW_BOX = `${-W - PAD} ${-H - PAD} ${(W + PAD) * 2} ${H * 2 + T_MAX + PAD * 2}`;

type LayerStripProps = {
  lit: Layer[];
  variant: "full" | "inline";
  className?: string;
};

export function LayerStrip({ lit, variant, className }: LayerStripProps) {
  return (
    <ol className={cx("layer-strip", className)} data-variant={variant} data-work="strip" aria-hidden="true">
      {LAYERS.map((layer) => {
        const lines = body(0, THICKNESS[layer]) + DETAIL[layer](0);
        return (
          <li
            key={layer}
            className="layer-strip__part"
            data-layer={layer}
            data-lit={lit.includes(layer) ? "" : undefined}
          >
            <svg className="layer-strip__plate" viewBox={VIEW_BOX} focusable="false">
              <path className="layer-strip__fill" d={silhouette(0, THICKNESS[layer])} />
              <path className="layer-strip__line" d={lines} vectorEffect="non-scaling-stroke" />
              <path
                className="layer-strip__line layer-strip__line--lit"
                d={lines}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span className="layer-strip__label part-label">
              <span className="part-label__number">{partNumber(layer).replace("P/N ", "")}</span>
              {variant === "full" && <span className="layer-strip__name"> — {LAYER_NAMES[layer]}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
