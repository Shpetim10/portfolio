"use client";

import { useRef, type ReactNode } from "react";
import { gsap, SplitText, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { createDecoder } from "@/motion/decode";
import { calibrateDimension } from "@/motion/signatures/calibrate";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * T04 · Manifesto + portrait — choreography.
 *
 * Motion score
 *   trigger                          element         property  from → to          ease     duration          mobile         reduced
 *   paragraph top → bottom crosses   words           opacity   dim → 1, in order  none     scrubbed          same (heading) paragraph dim → 1 · reduced (200ms), once
 *   the viewport centre              (hero moment)             (dust → bone)
 *   portrait top at 75%, once        cover plate     scaleY    1 → 0 (top first)  machine  large (1000ms)    same           portrait fades in · reduced, once
 *   …plate 70% open                  dimension line  CALIBRATE rules grow out     settle   large             same           (in the fade)
 *   …with it                         part label      opacity + decode             snap     micro + decode    same           (in the fade)
 *
 * Contrast: words never drop below --manifesto-dim (bone at that opacity over
 * carbon ≈ dust, > 6:1), so the paragraph passes AA at every scroll position.
 * Nothing starts below its static state except the portrait, which is not text.
 * Without JS, everything is static and fully drawn.
 */

export function ManifestoStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const scope = ref.current;
      if (!scope) return;
      const part = (name: string) => scope.querySelector<HTMLElement>(`[data-manifesto="${name}"]`)!;
      const text = part("text");
      const portrait = part("portrait");
      const { duration, stagger } = motionTokens();
      const dim = parseFloat(getComputedStyle(scope).getPropertyValue("--manifesto-dim")) || 1;
      const once = (trigger: Element, start = "top 75%") => ({ trigger, start, once: true });

      if (reduced) {
        gsap.fromTo(
          text,
          { opacity: dim },
          { opacity: 1, duration: duration.reduced, ease: "none", scrollTrigger: once(text, "top center") },
        );
        gsap.from(portrait, {
          opacity: 0,
          duration: duration.reduced,
          ease: "none",
          scrollTrigger: once(portrait),
        });
        return;
      }

      /* Words: dust → bone as the paragraph passes the viewport centre. */
      // aria "none": the words stay plain inline text for assistive tech (no aria-label on a <p>).
      const { words } = SplitText.create(text, {
        type: "words",
        tag: "span",
        wordsClass: "manifesto__word",
        aria: "none",
      });
      // Each word brightens over WORD_SPAN words' worth of scroll: a soft front, not a hard edge.
      const WORD_SPAN = 3;
      gsap.fromTo(
        words,
        { opacity: dim },
        {
          opacity: 1,
          ease: "none",
          duration: WORD_SPAN,
          stagger: 1,
          scrollTrigger: { trigger: text, start: "top center", end: "bottom center", scrub: true },
        },
      );

      /* Portrait: the cover plate drops away top → bottom, then the caption calibrates. */
      const label = portrait.querySelector<HTMLElement>(".portrait__label")!;
      const decoder = createDecoder(label);
      decoder.scramble();
      const plateTime = duration.large;
      gsap
        .timeline({ scrollTrigger: once(portrait) })
        .fromTo(part("plate"), { scaleY: 1 }, { scaleY: 0, duration: plateTime, ease: EASE.machine })
        .add(
          calibrateDimension(portrait.querySelector<HTMLElement>('[data-anim="dimension"]')!, motionTokens()),
          plateTime * 0.7,
        )
        .from(label, { opacity: 0, duration: duration.micro, ease: EASE.snap }, `<+=${stagger.items}`)
        .add(decoder.tween(duration.decode), "<");

      return () => decoder.restore();
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="manifesto">
      {children}
    </div>
  );
}
