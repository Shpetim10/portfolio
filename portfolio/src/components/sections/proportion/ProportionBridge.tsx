import type { CSSProperties } from "react";
import { anchorsOf, type DrawingData, type DrawingPoint } from "@/components/drawing/model";
import { LeaderLine, PartLabel } from "@/components/ui/Annotation";
import vitruvian from "@/content/drawing/vitruvian.json";
import { ProportionDrawing } from "./ProportionDrawing";
import { ProportionStage } from "./ProportionStage";

/*
 * T09d · Proportion — the bridge between Experience and Education. Not a
 * section: an <aside> with one <figure>, no index, no heading. Leonardo's
 * Vitruvian Man draws itself as the band scrolls past (never pinned); the
 * square is practice (Experience, above), the circle theory (Education, below).
 *
 * Layout (src/styles/proportion.css)
 *   desktop  (≥ 64rem) the drawing centred over columns 4–9; PRACTICE leads
 *            up-right from the square's top-right corner into columns 10–12,
 *            THEORY down-left from the circle's lower-left point into 1–3.
 *   compact  the drawing centred at full width; PRACTICE above it on a short
 *            vertical leader to the square's top centre, THEORY below it on
 *            one from the circle's bottom centre.
 *   both     a dust hairline runs from Experience's end to the square's top
 *            centre, and from the circle's bottom centre to Education's start.
 *            Experience's bottom padding and Education's top padding are
 *            halved, so the three read as one passage.
 *
 * Every mark is placed on the drawing's own anchors (anchorsOf — the points
 * GlyphLineDrawing's onLayout reports), as percentages of its box: correct in
 * the server HTML, before any measurement, at every width, so nothing shifts.
 * Exactly one label set is rendered per breakpoint (display: none on the
 * other), so each link is met once by keyboard and assistive tech.
 */

const data = vitruvian as DrawingData;
const anchors = anchorsOf(data.geometry);

const CAPTION = "After Leonardo da Vinci, Vitruvian Man, c. 1490.";
/**
 * The traced scan: Wikimedia Commons, File:Da_Vinci_Vitruve_Luc_Viatour.jpg
 * (the lead image of en.wikipedia.org/wiki/Vitruvian_Man). Commons files it as
 * PD-Art; the photographer asks for this credit "in the immediate vicinity of
 * the image", and we give it. Provenance: assets-src/vitruvian/SOURCE.md.
 */
const SCAN_CREDIT = { photographer: "Luc Viatour", site: "Lucnix.be", href: "https://lucnix.be" };

type Note = {
  name: "practice" | "theory";
  /** Line 1. */
  label: string;
  /** Line 2: the link to the section this half of the drawing stands for. */
  link: { href: string; arrow: string; text: string; name: string };
};

const PRACTICE: Note = {
  name: "practice",
  label: "Practice",
  link: { href: "#experience", arrow: "↑", text: "Experience", name: "Practice: up to Experience" },
};
const THEORY: Note = {
  name: "theory",
  label: "Theory",
  link: { href: "#education", arrow: "↓", text: "Education", name: "Theory: down to Education" },
};

/** An anchor as custom properties, read by the stylesheet as fractions of the box. */
const at = (name: string, { x, y }: DrawingPoint) => ({ [`--${name}-x`]: x, [`--${name}-y`]: y });

/**
 * The two label lines. Line 1 is hidden from assistive tech: ANNOTATE scrambles
 * it while the label is out, so the link carries the whole note as its name.
 */
function NoteText({ note }: { note: Note }) {
  const { href, arrow, text, name } = note.link;
  return (
    <>
      <span className="proportion__line" aria-hidden="true">
        <PartLabel name={note.label} />
      </span>
      <a href={href} className="link proportion__link" aria-label={name}>
        <span className="proportion__hit" aria-hidden="true" />
        <span aria-hidden="true">{arrow} </span>
        {text}
      </a>
    </>
  );
}

export function ProportionBridge() {
  return (
    <ProportionStage>
      <figure
        className="proportion__figure"
        // On the figure: the stylesheet derives the plate's width (--plate) from the square's share here.
        style={
          {
            "--square-size": data.geometry.square.size,
            ...at("top", anchors.squareTopCenter),
            ...at("bottom", anchors.circleBottomCenter),
            ...at("practice", anchors.squareTopRight),
            ...at("theory", anchors.circleBottomLeft),
          } as CSSProperties
        }
      >
        <div className="proportion__plate">
          <ProportionDrawing />

          {/* Experience → the square; the circle → Education. Clipped at the band's edges. */}
          <span className="proportion__thread" data-end="top" aria-hidden="true" />
          <span className="proportion__thread" data-end="bottom" aria-hidden="true" />

          {/* Desktop: leader lines out to the side columns. */}
          <LeaderLine direction="up-right" className="proportion__leader" data-note="practice">
            <NoteText note={PRACTICE} />
          </LeaderLine>
          <LeaderLine direction="down-left" className="proportion__leader" data-note="theory">
            <NoteText note={THEORY} />
          </LeaderLine>

          {/* Compact: centred above and below, on vertical leaders. */}
          {[PRACTICE, THEORY].map((note) => (
            <span key={note.name} className="proportion__stem" data-note={note.name} data-anim="stem">
              <span className="proportion__stem-thread" aria-hidden="true" />
              <span className="proportion__stem-label" data-anim-part="label">
                <NoteText note={note} />
              </span>
              <span className="proportion__stem-line" aria-hidden="true">
                <span className="proportion__stem-stroke" data-anim-part="stroke" />
                <span className="proportion__stem-dot" data-anim-part="dot" />
              </span>
            </span>
          ))}
        </div>
        <figcaption className="proportion__caption">
          {CAPTION}
          <span className="proportion__credit">
            {/* Breaks after the slash, never before it. */}
            Photo: {SCAN_CREDIT.photographer}
            {"\u00a0/ "}
            <a href={SCAN_CREDIT.href} className="link proportion__credit-link">
              {SCAN_CREDIT.site}
            </a>
          </span>
        </figcaption>
      </figure>
    </ProportionStage>
  );
}
