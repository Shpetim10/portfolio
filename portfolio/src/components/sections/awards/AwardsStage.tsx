"use client";

import { useRef, type ReactNode } from "react";
import { createDecoder } from "@/motion/decode";
import { gsap, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * T10 · Awards — choreography.
 *
 * Motion score
 *   trigger                          element            property          from → to           ease     duration          mobile  reduced
 *   section top → 60% of viewport    carbon plate       scaleY (to the    1 → 0               machine  large (1000ms)    same    plate fades out (200ms)
 *   (hero moment: INVERT)                               bottom edge)
 *   certificate title → 85%          title lines        yPercent (REVEAL) 120 → 0, lines      settle   large, 0.08s      same    title fades in (200ms)
 *   seal → 80%                       seal dial          rotate            -60° → 0°           machine  large             same    static
 *   …dial nearly home                seal centre        scale             0 → 1               snap     micro (180ms)     same    static
 *   record → 85%                     cards              opacity + y       0, 8px → 1, 0       settle   medium, items     same    record fades in (200ms)
 *   …each card                       stamp code         decode            scrambled → CRT·02  none     decode (400ms)    same    no scramble
 *   section bottom → 40%             carbon plate       scaleY (from the  0 → 1, reverses     machine  large             same    plate fades in/out (200ms)
 *   (INVERT exit, as Writing begins) (exit)             bottom edge)      on scroll back
 *   filter tab pressed               group shown        opacity (CSS)     0 → 1               settle   small (320ms)     same    reduced (200ms)
 *   hover / focus a card             sheet + outline    translate · opac. 0 → −4px · 0 → 1    settle   small · micro     n/a     outline only
 * The hero moment is the INVERT: the page turns to paper for this one
 * section. Everything else is quiet: the seal's dial winds home like a
 * mechanism settling, then its signal centre lands.
 * Longest run: cards stagger over at most 1s total + 600ms = 1.6s, the UI cap.
 * The INVERT plates live in src/motion/signatures/invert.tsx, REVEAL in reveal.tsx.
 * Without JS everything is static and in place.
 */

/** The record's total stagger never exceeds this (s), so its last card lands within 1.6s. */
const STAGGER_BUDGET = 1;

export function AwardsStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const scope = ref.current;
      if (!scope) return;
      const { duration, stagger } = motionTokens();
      const record = scope.querySelector<HTMLElement>('[data-awards="record"]');

      if (reduced) {
        if (record) {
          gsap.from(record, {
            opacity: 0,
            duration: duration.reduced,
            ease: "none",
            scrollTrigger: { trigger: record, start: "top 85%", once: true },
          });
        }
        return;
      }

      /* Seal: the dial winds home, then the signal centre lands. */
      const seal = scope.querySelector<SVGSVGElement>('[data-awards="seal"]');
      if (seal) {
        gsap
          .timeline({ scrollTrigger: { trigger: seal, start: "top 80%", once: true } })
          .from('[data-awards="seal-dial"]', {
            rotation: -60,
            svgOrigin: "100 100",
            duration: duration.large,
            ease: EASE.machine,
          })
          .from(
            '[data-awards="seal-core"]',
            { scale: 0, svgOrigin: "100 100", duration: duration.micro, ease: EASE.snap },
            duration.large - duration.micro,
          );
      }

      if (!record) return;

      /* Record: cards settle in at the item stagger; each stamp decodes as its card lands. */
      const cards = [...record.querySelectorAll<HTMLElement>('[data-awards="card"]')];
      const each = cards.length > 1 ? Math.min(stagger.items, STAGGER_BUDGET / (cards.length - 1)) : 0;
      const tl = gsap.timeline({ scrollTrigger: { trigger: record, start: "top 85%", once: true } });
      const restores = cards.map((card, i) => {
        const decoder = createDecoder(card.querySelector('[data-awards="decode"]')!);
        decoder.scramble();
        tl.from(card, { opacity: 0, y: 8, duration: duration.medium, ease: EASE.settle }, i * each).add(
          decoder.tween(duration.decode),
          i * each,
        );
        return decoder.restore;
      });

      return () => restores.forEach((restore) => restore());
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="awards">
      {children}
    </div>
  );
}
