"use client";

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { calibrateDimension } from "@/motion/signatures/calibrate";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * T09b · Education — choreography.
 *
 * Motion score
 *   trigger                     element            property          from → to            ease     duration          mobile  reduced
 *   row 60% in view, once;      cells              opacity + y       0, 8px → 1, 0        settle   medium, items     same    row fades in (200ms)
 *   rows entering together
 *   stagger 0.08s
 *   …same (hero moment:         gauge fill         scaleX (from      0 → 1                machine  large (1000ms)    same    filled, static
 *   CALIBRATE)                                     the minimum)
 *   …same                       grade figures      text count        min → value          machine  large             same    final value
 *   …same                       dimension line     rules · ticks     grow out from value  settle   large             same    drawn
 *   …fill lands                 signal dot         scale             0 → 1                snap     micro (180ms)     same    shown
 *   idle                        in-progress LED    opacity (CSS)     breathes             machine  2.4s cycle        same    lit, still
 * The hero moment: each grade calibrating — its fill extending along the
 * scale while the figure counts up to it, then the dot landing on the value.
 * Longest row: 1000ms + 180ms = 1.18s (+ 0.08s per row entering with it), under the 1.6s cap.
 * Figures count on tabular numerals with every digit position kept, so nothing reflows.
 * Without JS everything is static, filled and final.
 */

/** "Row 60% in view": the point 60% down the row crosses the bottom of the viewport. */
const START = "60% bottom";

export function EducationStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const scope = ref.current;
      if (!scope) return;
      const tokens = motionTokens();
      const { duration, stagger } = tokens;
      const rows = [...scope.querySelectorAll<HTMLElement>('[data-edu="row"]')];
      if (rows.length === 0) return;
      const part = (row: HTMLElement, name: string) => [
        ...row.querySelectorAll<HTMLElement>(`[data-edu="${name}"]`),
      ];

      const restores: (() => void)[] = [];
      const timelines = new Map(
        rows.map((row) => {
          const tl = gsap.timeline({ paused: true });
          if (reduced) {
            tl.from(row, { opacity: 0, duration: duration.reduced, ease: "none" });
            return [row, tl];
          }

          tl.from(part(row, "cell"), {
            opacity: 0,
            y: 8,
            duration: duration.medium,
            ease: EASE.settle,
            stagger: stagger.items,
          });

          const [fill] = part(row, "fill");
          if (fill) {
            const machine = { duration: duration.large, ease: EASE.machine };
            tl.from(fill, { ...machine, scaleX: 0, transformOrigin: "left center" }, 0)
              .from(part(row, "dot"), { scale: 0, duration: duration.micro, ease: EASE.snap }, duration.large)
              .add(calibrateDimension(row.querySelector<HTMLElement>('[data-anim="dimension"]')!, tokens), 0);

            for (const figure of part(row, "count")) {
              const original = figure.textContent;
              const value = Number(figure.dataset.value);
              const decimals = original?.split(".")[1]?.length ?? 0;
              const state = { value: Number(figure.dataset.from ?? 0) };
              // Every digit position from the first frame (0.00 → 9.94): the width never changes.
              const readout = new Intl.NumberFormat("en-US", {
                minimumIntegerDigits: String(Math.trunc(value)).length,
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              });
              const paint = () => {
                figure.textContent = readout.format(state.value);
              };
              const restore = () => {
                figure.textContent = original;
              };
              paint();
              tl.to(state, { ...machine, value, onUpdate: paint, onComplete: restore }, 0);
              restores.push(restore);
            }
          }
          return [row, tl];
        }),
      );

      // Rows entering on the same frame (a tall viewport, a deep link) start 0.08s apart.
      ScrollTrigger.batch(rows, {
        start: `clamp(${START})`,
        once: true,
        onEnter: (batch) =>
          batch.forEach((row, i) => {
            const tl = timelines.get(row as HTMLElement);
            tl?.delay(i * stagger.lines).restart(true);
          }),
      });

      return () => restores.forEach((restore) => restore());
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="education">
      {children}
    </div>
  );
}
