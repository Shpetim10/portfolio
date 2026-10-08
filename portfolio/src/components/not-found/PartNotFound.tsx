import NextLink from "next/link";
import { LAYER_NAMES, LAYERS } from "@/components/chrome/nav";
import { InstrumentDrawing } from "@/components/three/InstrumentDrawing";
import { SectionIndex } from "@/components/ui/Annotation";
import { NotFoundStage } from "./NotFoundStage";
import { RequestedPath } from "./RequestedPath";
import { SlotAnnotation } from "./SlotAnnotation";
import { MISSING, MISSING_LABEL } from "./slot";

/*
 * T14 · 404 — PART NOT FOUND. The Instrument, exploded, with one part missing:
 * its slot drawn in phantom lines and measured by a dimension line.
 * Static, readable markup first; NotFoundStage adds the 3D and the drag on desktop.
 *
 * Layout (src/styles/not-found.css)
 *   desktop  (≥ 64rem) title, notes, actions and the title block in columns 1–6;
 *            the figure in 7–12, spanning both rows, never taller than the viewport.
 *   mobile   title in display-xl (two lines), then the figure at full width
 *            (capped in height), then notes, actions and the title block.
 *
 * Rendered by app/global-not-found.tsx, outside the site layout: no header,
 * menu, cursor or smooth scroll. Links never prefetch: leaving the 404 crosses
 * root layouts (a full page load), so the site's chunks stay off its budget.
 */

const present = LAYERS.filter((layer) => layer !== MISSING).map((layer) => LAYER_NAMES[layer]);
const CAPTION =
  `Exploded drawing of the Instrument. ${present.slice(0, -1).join(", ")} and ${present.at(-1)} are in place; ` +
  `the slot for ${MISSING_LABEL} is empty, outlined in phantom lines and measured by a dimension line.`;

export function PartNotFound() {
  return (
    <main id="main" className="pnf layout-grid">
      <header className="pnf__head">
        <SectionIndex index={404} title="Assembly check" rev="Failed" />
        <h1 className="pnf__title">Part not found</h1>
      </header>

      <div className="pnf__stage">
        <NotFoundStage
          drawing={<InstrumentDrawing missing={MISSING} />}
          annotation={<SlotAnnotation />}
          caption={CAPTION}
        />
      </div>

      <div className="pnf__body">
        <section className="pnf__notes" aria-labelledby="pnf-notes">
          <h2 id="pnf-notes" className="pnf__label">
            Notes
          </h2>
          <ol className="pnf__list">
            <li>Nothing is drawn at this address.</li>
            <li>The other four parts are where you left them.</li>
          </ol>
        </section>

        <nav className="pnf__actions" aria-label="Way back">
          <NextLink className="button" data-variant="primary" href="/" prefetch={false}>
            <span className="button__label">Return to assembly</span>
            <span className="button__arrow" aria-hidden="true">
              →
            </span>
          </NextLink>
          <NextLink className="link" href="/resume/" prefetch={false}>
            Read the resume
          </NextLink>
        </nav>

        <dl className="title-block__grid pnf__block">
          <div className="title-block__field pnf__wide">
            <dt>Requested</dt>
            <dd>
              <RequestedPath />
            </dd>
          </div>
          <div className="title-block__field pnf__wide">
            <dt>Part</dt>
            <dd>{MISSING_LABEL}</dd>
          </div>
          <div className="title-block__field">
            <dt>Status</dt>
            <dd>Not found</dd>
          </div>
          <div className="title-block__field">
            <dt>Code</dt>
            <dd>404</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
