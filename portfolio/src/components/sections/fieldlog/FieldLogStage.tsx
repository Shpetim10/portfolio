"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * T11 · Field log — choreography.
 *   trigger            element          property   from → to        ease    duration                 reduced
 *   matrix → 85%       week columns     opacity    0 → 1            settle  medium, spread over 0.6s  matrix fades (200ms)
 *   log → 85%          entries          opacity+y  0, 8px → 1, 0    settle  medium, items stagger     log fades (200ms)
 * Opacity and transform only. Without JS everything is static and in place.
 */

export function FieldLogStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const scope = ref.current;
      if (!scope) return;
      const { duration, stagger } = motionTokens();
      const matrix = scope.querySelector<HTMLElement>('[data-fieldlog="matrix"]');
      const log = scope.querySelector<HTMLElement>('[data-fieldlog="log"]');
      const once = (trigger: Element) => ({ trigger, start: "top 85%", once: true });

      if (reduced) {
        for (const block of [matrix, log]) {
          if (block) {
            gsap.from(block, {
              opacity: 0,
              duration: duration.reduced,
              ease: "none",
              scrollTrigger: once(block),
            });
          }
        }
        return;
      }

      if (matrix) {
        gsap.from(matrix.querySelectorAll('[data-fieldlog="col"]'), {
          opacity: 0,
          duration: duration.medium,
          ease: EASE.settle,
          stagger: { amount: 0.6 },
          scrollTrigger: once(matrix),
        });
      }
      if (log) {
        gsap.from(log.querySelectorAll('[data-fieldlog="entry"]'), {
          opacity: 0,
          y: 8,
          duration: duration.medium,
          ease: EASE.settle,
          stagger: { each: stagger.items, ease: "none" },
          scrollTrigger: once(log),
        });
      }
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="fieldlog">
      {children}
    </div>
  );
}
