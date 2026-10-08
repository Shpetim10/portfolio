import type { ReactNode } from "react";
import { ContentError } from "@/content";
import { CHAPTERS } from "@/content/chapters";
import { Reveal } from "@/motion/signatures/reveal";

/*
 * One chapter of a case study, written in MDX as <Chapter id="problem">…</Chapter>.
 * The id picks the title and number from the fixed order (src/content/chapters.ts).
 *
 * Layout (src/styles/case-study.css)
 *   desktop  the chapter heading holds still in columns 1–3 (sticky) while the
 *            story scrolls past in 5–11; figures widen to 4–12; a spread bleeds
 *            edge to edge and passes over the heading.
 *   mobile   heading above, story below, full width.
 * Heading: number row (decorative) then the h2, which REVEALs (lines rise).
 */

export function Chapter({ id, children }: { id: string; children: ReactNode }) {
  const index = CHAPTERS.findIndex((chapter) => chapter.id === id);
  if (index < 0) throw new ContentError(`Unknown chapter "${id}".`);
  const number = String(index + 1).padStart(2, "0");
  const headingId = `chapter-${id}`;

  return (
    <section id={id} className="chapter layout-grid" aria-labelledby={headingId}>
      <header className="chapter__header">
        <p className="section-index chapter__index" aria-hidden="true">
          <span className="section-index__number">[{number}]</span>
          <span className="section-index__rule" />
          <span className="section-index__rev">
            {number} / {String(CHAPTERS.length).padStart(2, "0")}
          </span>
        </p>
        <Reveal as="h2" id={headingId} className="chapter__title">
          {CHAPTERS[index].title}
        </Reveal>
      </header>
      <div className="chapter__body">{children}</div>
    </section>
  );
}
