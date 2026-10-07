import type { CSSProperties } from "react";
import { LAYER_NAMES, LAYERS, partNumber } from "@/components/chrome/nav";
import { Status } from "@/components/chrome/Status";
import { InstrumentDrawing, STATIC_ANCHORS } from "@/components/three/InstrumentDrawing";
import { PART_NOTES } from "@/components/three/parts";
import { LeaderLine } from "@/components/ui/Annotation";
import { Content } from "@/components/ui/Content";
import { getProfile, isTodo } from "@/content";
import { HeroStage } from "./HeroStage";

/*
 * T03 · Hero. Static, readable markup first (server-rendered, complete with JS
 * off); HeroStage adds the pin, the scroll choreography and the 3D scene.
 *
 * Layout (src/styles/hero.css)
 *   desktop  name in display-xl across the full width (may bleed), the
 *            Instrument centre-right in front of it, standing on the horizon;
 *            positioning line bottom-left, status block bottom-right.
 *   mobile   name on top, in front; the Instrument below it; positioning and
 *            status stacked under the horizon. Labels break onto two lines.
 *   static   (reduced motion, no JS) the same content in flow, the Instrument
 *            shown exploded with every label drawn.
 *
 * The name is the LCP element: plain text, painted on the first frame, never
 * hidden for an entrance. The 3D canvas is not an LCP candidate.
 */

const NAME_ID = "hero-name";

export function Hero() {
  const profile = getProfile();

  return (
    <HeroStage
      labelledBy={NAME_ID}
      name={<Name name={profile.name} />}
      drawing={<InstrumentDrawing />}
      notes={<PartNotes />}
      footer={
        <>
          {/* The preloader's calibration line lands here (T01). */}
          <span className="hero__horizon" data-horizon="" aria-hidden="true" />
          <div className="hero__footer">
            <Content as="p" value={profile.positioning} className="hero__positioning" />
            <div className="hero__status">
              <Content as="p" value={profile.role} className="hero__role" />
              <Status availability={profile.availability} timezone={profile.timezone} />
              <p className="hero__cue" data-hero="cue">
                Scroll
                <span className="hero__cue-arrow" aria-hidden="true">
                  ↓
                </span>
              </p>
            </div>
          </div>
        </>
      }
    />
  );
}

/**
 * The name as one plain text block — a single LCP candidate on the first frame.
 * In live mode HeroStage splits it into masked lines (SplitText) for the exit.
 * A missing name renders its placeholder at full size, marked TODO.
 */
function Name({ name }: { name: string }) {
  const missing = isTodo(name);

  return (
    <h1 id={NAME_ID} className="hero__name" data-todo={missing ? "" : undefined}>
      {missing && (
        <span className="hero__todo" data-hero="todo">
          TODO<span className="sr-only">:</span>
          <span aria-hidden="true">(content) · name</span>
        </span>
      )}
      <span className="hero__text" data-hero="name">
        {missing ? name.replace(/^TODO:\s*/, "") : name}
      </span>
    </h1>
  );
}

/** The five parts, labelled. In flow order this is the readable version of the explode. */
function PartNotes() {
  return (
    <ol className="instrument-notes" aria-label="The Instrument, part by part">
      {LAYERS.map((layer, i) => (
        <li
          key={layer}
          className="instrument-note"
          data-layer={layer}
          style={{ "--note-x": STATIC_ANCHORS[i].x, "--note-y": STATIC_ANCHORS[i].y } as CSSProperties}
        >
          <div className="instrument-note__body">
            <LeaderLine direction="up-right">
              <span className="part-label instrument-note__label">
                <span className="part-label__number">{partNumber(layer)}</span>
                {" — "}
                {LAYER_NAMES[layer]}
              </span>
            </LeaderLine>
            <span className="instrument-note__line" data-hero="note-line">
              {PART_NOTES[layer]}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
