"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { useLenis } from "@/motion/MotionProvider";
import { motionTokens } from "@/motion/tokens";

/*
 * T06 · Selected work — choreography.
 *
 * Motion score
 *   trigger                        element          property         from → to              ease    duration          mobile                      reduced
 *   track pinned (desktop)         rail             x                0 → −travel            none    scrubbed 1:1      no track: stacked cards     stacked cards, no pin
 *   section enters (desktop)       first cover      scale            --work-cover-scale → 1 none    scrubbed          —                           cover fades in (200ms)
 *   panel left edge → centre       its cover        scale            --work-cover-scale → 1 none    scrubbed          card top enters → centre    cover fades in (200ms)
 *   panel centred                  layer strip      lit plates       crossfade (opacity)    settle  small (320ms)     inline strip, lit statically lit statically
 *   …same                          panel P/N        colour           dust → signal          settle  small             —                           —
 *   hover / focus (fine pointer)   cover notes      opacity + y      0, 8px → 1, 0          settle  small             always shown (touch)        opacity only
 *   click                          cover            view transition  panel → case header    machine large (1000ms)    same                        200ms crossfade in place
 *   click, no View Transitions     page wipe        scaleY (paper)   0 → 1 → 0              machine medium × 2        same                        200ms fade in / out
 * The hero moment: a cover settling to scale 1 as its panel reaches the centre
 * while its plates light up below.
 *
 * Pin: like the hero, the stage is position: sticky inside a track that is
 * taller by exactly the rail's travel (--work-travel). Scroll stays native
 * (Lenis-smoothed) and vertical: no wheel handlers, no horizontal scroller, so
 * a trackpad is never captured; the user scrolls through and past at will.
 *
 * Keyboard: focusing a panel's link scrolls the page to the point where that
 * panel is centred. The stage clips with overflow: clip (not a scroll
 * container), so the browser can't scroll it sideways behind our back.
 */

const DESKTOP = "(width >= 64rem)";
const COMPACT = "(width < 64rem)";

/** Runs before first paint: full motion gets the live layout at once, so nothing shifts on hydration. */
const MODE_SCRIPT = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.currentScript.parentElement.dataset.mode="live"}catch(e){}`;

type WorkProbe = {
  read?: () => { active: number; progress: number; travel: number };
};

declare global {
  interface Window {
    /** Test-only probe. Playwright sets an object in an init script; the work track adds `read`. */
    __WORK_PROBE__?: WorkProbe;
  }
}

export function WorkStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const { duration } = motionTokens();
      const panels = [...root.querySelectorAll<HTMLElement>('[data-work="panel"]')];
      const media = panels.map((panel) => panel.querySelector<HTMLElement>('[data-cover="media"]')!);

      if (reduced) {
        delete root.dataset.mode;
        media.forEach((cover) =>
          gsap.from(cover, {
            opacity: 0,
            duration: duration.reduced,
            ease: "none",
            scrollTrigger: { trigger: cover, start: "top 85%", once: true },
          }),
        );
        ScrollTrigger.refresh();
        return;
      }
      root.dataset.mode = "live";

      const scale = parseFloat(getComputedStyle(root).getPropertyValue("--work-cover-scale")) || 1;
      const settle = (cover: HTMLElement, scrollTrigger: ScrollTrigger.Vars) =>
        gsap.fromTo(
          cover,
          { scale },
          { scale: 1, ease: "none", scrollTrigger: { scrub: true, ...scrollTrigger } },
        );

      const mm = gsap.matchMedia();

      mm.add(DESKTOP, () => {
        const stage = root.querySelector<HTMLElement>('[data-work="stage"]')!;
        const rail = root.querySelector<HTMLElement>('[data-work="rail"]')!;
        const strip = [...root.querySelectorAll<HTMLElement>(".work__strip .layer-strip__part")];
        const readPart = root.querySelector<HTMLElement>('[data-work="readout-part"]')!;
        const readIndex = root.querySelector<HTMLElement>('[data-work="readout-index"]')!;
        const last = Math.max(panels.length - 1, 1);

        // Rail width − stage width. The rail's side padding centres the first and last panels.
        const travel = () => Math.max(rail.scrollWidth - stage.clientWidth, 0);
        const setTravel = () => root.style.setProperty("--work-travel", `${travel()}px`);
        ScrollTrigger.addEventListener("refreshInit", setTravel);
        setTravel();

        let active = -1;
        const light = (index: number) => {
          if (index === active) return;
          active = index;
          panels.forEach((panel, i) => panel.toggleAttribute("data-active", i === index));
          const lit = new Set((panels[index]?.dataset.layers ?? "").split(" "));
          strip.forEach((part) => part.toggleAttribute("data-lit", lit.has(part.dataset.layer!)));
          readPart.textContent = panels[index]?.querySelector(".work-panel__part")?.textContent ?? "";
          readIndex.textContent = String(index + 1).padStart(2, "0");
        };
        const initial = {
          part: readPart.textContent,
          lit: strip.map((part) => part.hasAttribute("data-lit")),
        };

        const track = gsap.to(rail, {
          x: () => -travel(),
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => light(Math.round(self.progress * last)),
            onRefresh: (self) => light(Math.round(self.progress * last)),
          },
        });
        const trigger = track.scrollTrigger!;

        media.forEach((cover, i) =>
          i === 0
            ? // The first panel starts centred: it settles as the section scrolls up to the pin.
              settle(cover, { trigger: root, start: "top bottom", end: "top top" })
            : settle(cover, {
                trigger: panels[i],
                containerAnimation: track,
                start: "left right",
                end: "center center",
              }),
        );

        // Keyboard: centre the focused project. After the browser's own focus scroll, so ours wins.
        let frame = 0;
        const onFocus = (event: FocusEvent) => {
          const panel = (event.target as Element).closest<HTMLElement>('[data-work="panel"]');
          const index = panel ? panels.indexOf(panel) : -1;
          if (index < 0) return;
          const y = trigger.start + ((trigger.end - trigger.start) * index) / last;
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const smooth = lenisRef.current;
            if (smooth) smooth.scrollTo(y, { immediate: true, force: true });
            else window.scrollTo({ top: y, behavior: "instant" });
          });
        };
        root.addEventListener("focusin", onFocus);

        light(Math.round(trigger.progress * last));

        const probe = window.__WORK_PROBE__;
        if (probe) probe.read = () => ({ active, progress: trigger.progress, travel: travel() });

        return () => {
          cancelAnimationFrame(frame);
          root.removeEventListener("focusin", onFocus);
          ScrollTrigger.removeEventListener("refreshInit", setTravel);
          root.style.removeProperty("--work-travel");
          panels.forEach((panel) => panel.removeAttribute("data-active"));
          strip.forEach((part, i) => part.toggleAttribute("data-lit", initial.lit[i]));
          readPart.textContent = initial.part;
          readIndex.textContent = "01";
          if (probe) delete probe.read;
        };
      });

      mm.add(COMPACT, () => {
        media.forEach((cover, i) =>
          settle(cover, { trigger: panels[i], start: "top bottom", end: "center center" }),
        );
      });

      ScrollTrigger.refresh();
      return () => {
        mm.revert();
        delete root.dataset.mode;
      };
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="work" suppressHydrationWarning>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }}
      />
      {children}
    </div>
  );
}
