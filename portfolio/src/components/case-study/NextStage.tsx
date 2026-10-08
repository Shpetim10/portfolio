"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { motionTokens } from "@/motion/tokens";

/*
 * T07 · Next project — choreography.
 *
 * Motion score
 *   trigger                         element      property     from → to               ease    duration        mobile  reduced
 *   panel top 100% → 40% of view    cover media  scale        --work-cover-scale → 1  none    scrubbed        same    cover fades in (200ms)
 *   hover / focus (fine pointer)    cover note   opacity + y  0, 8px → 1, 0           settle  small (CSS)     shown   opacity only
 *   click                           cover        view transition → next header    machine large (1000ms)   same    200ms crossfade
 * The cover is the same element the next page opens with, so the preview and
 * the transition read as one move forward.
 */

export function NextStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const root = ref.current;
      const media = root?.querySelector<HTMLElement>('[data-cover="media"]');
      if (!root || !media) return;

      if (reduced) {
        gsap.from(media, {
          opacity: 0,
          duration: motionTokens().duration.reduced,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top 85%", once: true },
        });
        return;
      }

      const from = parseFloat(getComputedStyle(root).getPropertyValue("--work-cover-scale")) || 1;
      gsap.fromTo(
        media,
        { scale: from },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top bottom", end: "top 40%", scrub: true },
        },
      );
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="next-project__body">
      {children}
    </div>
  );
}
