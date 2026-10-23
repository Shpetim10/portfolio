"use client";

import { useEffect, useRef, useState } from "react";
import { createDecoder } from "@/motion/decode";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { motionTokens } from "@/motion/tokens";

/*
 * Fixed section indicator — the drawing's sheet reference, bottom-left:
 * "[06]  EXPERIENCE" for the homepage section crossing the viewport's middle
 * line, read from the data-indicator-* attributes SectionShell writes. A part
 * without an index (the Proportion bridge, T09d) shows its title alone. Hidden
 * over the hero, which has no index; the footer never reaches the middle line,
 * so Contact holds to the end.
 *
 * Motion score
 *   trigger          element  property  from → to                ease   duration         mobile  reduced
 *   part changes     title    decode    scramble → text (L → R)  none   decode (400ms)   same    swapped, no decode
 *   shown / hidden   all      opacity   0 ↔ 1                    snap   small (CSS)      same    reduced (200ms)
 *
 * It repeats what the section index at each section's top already says, so
 * it is aria-hidden: landmarks carry the structure for assistive tech.
 */

type Part = { index: string | null; title: string };

const SELECTOR = "[data-indicator-title]";

export function SectionIndicator() {
  const [part, setPart] = useState<Part | null>(null);
  // Hidden keeps the last part printed, so it fades out rather than blanking first.
  const [shown, setShown] = useState(false);
  const titleRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const parts = [...document.querySelectorAll<HTMLElement>(SELECTOR)];
    const crossing = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          entry.isIntersecting ? crossing.add(entry.target) : crossing.delete(entry.target),
        );
        // Parts are contiguous; should two touch the line at once, the later one has just arrived.
        const active = parts.findLast((element) => crossing.has(element));
        const title = active?.dataset.indicatorTitle;
        setShown(title !== undefined);
        if (title === undefined) return;
        const index = active?.dataset.indicatorIndex ?? null;
        setPart((prev) => (prev?.index === index && prev.title === title ? prev : { index, title }));
      },
      // A one-pixel band across the middle of the viewport.
      { rootMargin: "-50% 0px -50% 0px" },
    );
    parts.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  // Each new part's title decodes in, mono label style.
  useEffect(() => {
    const title = titleRef.current;
    if (!title || !part || reduced) return;
    const decoder = createDecoder(title);
    decoder.scramble();
    const tween = decoder.tween(motionTokens().duration.decode);
    return () => {
      tween.kill();
      decoder.restore();
    };
  }, [part, reduced]);

  return (
    <p className="section-indicator" aria-hidden="true" data-shown={shown ? "" : undefined}>
      {part?.index && <span className="section-indicator__number">[{part.index}]</span>}
      <span ref={titleRef} key={part?.title} className="section-indicator__title">
        {part?.title}
      </span>
    </p>
  );
}
