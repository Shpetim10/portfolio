"use client";

import { useRef, type ReactNode } from "react";
import { createDecoder } from "@/motion/decode";
import { gsap, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { EASE, motionTokens } from "@/motion/tokens";
import { renderedIn } from "@/motion/useScrollMotion";

/*
 * T09 · Experience — choreography.
 *
 * Motion score
 *   trigger                          element          property          from → to          ease    duration          mobile  reduced
 *   list top → bottom crosses the    spine segments   scaleY (top down) 0 → 1, in order    none    scrubbed          cards   static, fully drawn
 *   pen line (70% of the viewport)   (hero moment)
 *   the pen reaches a row's node     node             scale             0 → 1              snap    micro (180ms)     same    list fades in (200ms), once
 *   …same                            tick             scaleX (from      0 → 1              settle  small (320ms)     same    (in the fade)
 *                                                     the spine)
 *   …tick half drawn                 REV marker       opacity + decode  scrambled → REV C  snap    micro + decode    same    (in the fade)
 *   …same                            cells            opacity + y       0, 8px → 1, 0      settle  medium, items     same    (in the fade)
 * The hero moment: the spine drawing down with the scroll, each revision
 * annotating in the moment the pen reaches its node.
 * Longest row: 160ms + 3 × 60ms + 600ms = 0.94s, under the 1.6s UI cap.
 *
 * The spine timeline runs in pixels of list height, each segment placed at
 * its own offset, so the pen's tip sits exactly on the pen line throughout.
 * Triggers are clamp()ed to the scroll range: near the foot of a page, where
 * the pen line can't reach the last nodes, the spine finishes and the last
 * rows annotate when the page bottoms out instead of staying undrawn.
 * Only the rendered layout (table or cards) is animated. Without JS
 * everything is static and fully drawn.
 */

/** Where the pen draws: this far down the viewport. */
const PEN = "70%";
/** px the pen leads by: the maximum scroll can be fractional, and a clamped trigger must stay reachable. */
const SLACK = 2;

export function ExperienceStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const scope = ref.current;
      const list = scope && renderedIn(scope, '[data-rev="list"]')[0];
      if (!list) return;
      const { duration, stagger } = motionTokens();

      if (reduced) {
        gsap.from(list, {
          opacity: 0,
          duration: duration.reduced,
          ease: "none",
          scrollTrigger: { trigger: list, start: `clamp(top ${PEN})`, once: true },
        });
        return;
      }

      const rows = [...list.querySelectorAll<HTMLElement>('[data-rev="row"]')];
      const part = (row: HTMLElement, name: string) =>
        row.querySelector<HTMLElement>(`[data-rev="${name}"]`)!;
      const origin = list.getBoundingClientRect();

      /* Spine: scrubbed, one segment after another down the list. */
      const spine = gsap.timeline({
        scrollTrigger: {
          trigger: list,
          start: `top ${PEN}`,
          end: `clamp(bottom-=${SLACK} ${PEN})`,
          scrub: true,
        },
      });
      for (const row of rows) {
        const segment = part(row, "spine");
        const box = segment.getBoundingClientRect();
        if (box.height === 0) continue; // a lone revision has no spine
        spine.fromTo(
          segment,
          { scaleY: 0 },
          { scaleY: 1, transformOrigin: "center top", ease: "none", duration: box.height },
          box.top - origin.top,
        );
      }
      spine.to({}, { duration: 0 }, origin.height - SLACK);

      /* Rows: each annotates as the pen reaches its node. */
      const restores = rows.map((row) => {
        const node = part(row, "node");
        const nodeBox = node.getBoundingClientRect();
        const at = nodeBox.top + nodeBox.height / 2 - row.getBoundingClientRect().top;
        const decoder = createDecoder(part(row, "decode"));
        decoder.scramble();
        const half = duration.small / 2;

        gsap
          .timeline({
            scrollTrigger: { trigger: row, start: `clamp(top+=${at - SLACK} ${PEN})`, once: true },
          })
          .from(node, { scale: 0, duration: duration.micro, ease: EASE.snap })
          .from(
            part(row, "tick"),
            { scaleX: 0, transformOrigin: "left center", duration: duration.small, ease: EASE.settle },
            0,
          )
          .from(part(row, "marker"), { opacity: 0, duration: duration.micro, ease: EASE.snap }, half)
          .add(decoder.tween(duration.decode), half)
          .from(
            row.querySelectorAll('[data-rev="cell"]'),
            { opacity: 0, y: 8, duration: duration.medium, ease: EASE.settle, stagger: stagger.items },
            half,
          );
        return decoder.restore;
      });

      return () => restores.forEach((restore) => restore());
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="experience">
      {children}
    </div>
  );
}
