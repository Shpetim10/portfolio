"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/motion/gsap";
import { useMediaQuery } from "@/motion/hooks/useMediaQuery";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { motionTokens } from "@/motion/tokens";
import { renderedIn } from "@/motion/useScrollMotion";

/*
 * T07 · System diagram — choreography. The drawing draws itself as it scrolls through.
 *
 * Motion score (timeline scrubbed 1:1 by scroll: drawing top at 80% → bottom at 50% of the viewport)
 *   order                         element        property        from → to         mobile (tall drawing)   reduced
 *   column by column, lane 0.2    node box       scaleX (left)   0 → 1             same, top → bottom      figure fades in (200ms), drawn
 *   …half-way through its box     node label     opacity         0 → 1             same                    (in the fade)
 *   once both ends exist          link segments  scale (start)   0 → 1, in turn    same                    (in the fade)
 *   …line arrives                 target dot     opacity         0 → 1             same                    (in the fade)
 *   …half-way along               link label     opacity         0 → 1             same                    (in the fade)
 * Lines draw by scaling each straight segment from its own start point (a
 * straight line scaled about one end is that line, partly drawn) — transform
 * only, the pen moving at one speed round every elbow. Scroll stays native:
 * scrubbing never holds the page, and scrolling back undraws.
 * Without JS the drawing is static and complete.
 */

const WIDE = "(width >= 48rem)";

// Timeline units; positions come from the layout (diagram.ts: one unit per column).
const BOX = 0.4;
const LINK = 0.6;
const DOT = 0.1;

const attr = (element: Element, name: string) => Number(element.getAttribute(name));

export function DiagramStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // The shown drawing changes at the breakpoint: rebuild on the one now rendered.
  const wide = useMediaQuery(WIDE);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;

      if (reduced) {
        gsap.from(root, {
          opacity: 0,
          duration: motionTokens().duration.reduced,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top 85%", once: true },
        });
        return;
      }

      const [drawing] = renderedIn(root, ".diagram__drawing");
      if (!drawing) return;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: drawing, start: "top 80%", end: "bottom 50%", scrub: true },
      });

      drawing.querySelectorAll<SVGRectElement>('[data-diagram="box"]').forEach((box) => {
        const at = attr(box, "data-at");
        const label = drawing.querySelector(`[data-diagram="label"][data-node="${box.dataset.node}"]`);
        tl.from(box, { scaleX: 0, transformOrigin: "0% 50%", duration: BOX }, at).from(
          label,
          { opacity: 0, duration: BOX },
          at + BOX / 2,
        );
      });

      drawing.querySelectorAll<SVGGElement>('[data-diagram="link"]').forEach((link) => {
        const segments = [...link.querySelectorAll<SVGLineElement>('[data-diagram="segment"]')];
        const total = segments.reduce((sum, line) => sum + attr(line, "data-length"), 0) || 1;
        let at = attr(link, "data-at");
        for (const line of segments) {
          const span = (LINK * attr(line, "data-length")) / total;
          tl.from(
            line,
            { scale: 0, svgOrigin: `${attr(line, "x1")} ${attr(line, "y1")}`, duration: span },
            at,
          );
          at += span;
        }
        tl.from(link.querySelector('[data-diagram="dot"]'), { opacity: 0, duration: DOT }, at);
      });

      drawing.querySelectorAll<HTMLElement>('[data-diagram="link-label"]').forEach((label) => {
        tl.from(label, { opacity: 0, duration: BOX }, attr(label, "data-at") + LINK / 2);
      });
    },
    { scope: ref, dependencies: [reduced, wide], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="diagram__stage">
      {children}
    </div>
  );
}
