"use client";

import { useRef, type ReactNode } from "react";
import { createDecoder } from "@/motion/decode";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * Work index — choreography.
 *
 * Motion score
 *   trigger                        element             property        from → to                ease     duration         mobile   reduced
 *   page load                      index rule          scaleX          0 → 1                    machine  large            same     static
 *   header top → bottom at top     masthead            y, opacity      0, 1 → 24%, 0.2          none     scrubbed 1:1     same     static
 *   entry top crosses 80%          entry rule          scaleX          0 → 1                    machine  medium           same     entry fades in (200ms)
 *   …same, +micro                  cover shutter       scaleY          1 → 0 (lifts upward)     machine  large            same     —
 *   …same, +micro                  P/N                 decode          scramble → text          linear   decode (400ms)   same     —
 *   …same, +small                  title lines (REVEAL) yPercent      120 → 0                  settle   large · lines    same     —
 *   …same, +small                  head, cells, layers opacity, y      0, 16px → 1, 0           settle   medium · items   same     —
 *   …after the layers land         strip plates        lit             one plate per item step  settle   small (CSS)      same     lit statically
 *   entry top 100% → centre        cover media         scale           --work-cover-scale → 1   none     scrubbed         same     —
 *   entry crosses the centre line  register link       colour + dot    dust → bone, dot on      settle   small (CSS)      hidden   no transition
 *   list top → bottom past centre  register progress   scaleY          0 → 1                    none     scrubbed 1:1     hidden   steps per entry
 *   hover / focus (fine pointer)   cover notes         opacity + y     0, 8px → 1, 0            settle   small (CSS)      shown    opacity only
 * Longest entry timeline: micro + small + large + 4 × lines ≈ 1.6s (UI cap).
 *
 * Initial states: a pre-paint script marks the page live (full motion only),
 * and src/styles/work-index.css hides what the timelines bring in, so nothing
 * flashes before hydration. No JS / reduced motion: everything is in place.
 * An entry's timeline is built when it enters (contextSafe), so its title is
 * split with the final font, and reverted with everything else on unmount.
 */

/** Runs before first paint: full motion gets the live initial states at once, so nothing flashes on hydration. */
const MODE_SCRIPT = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.currentScript.parentElement.dataset.mode="live"}catch(e){}`;

// Start offset of each title line: 100% of its height + the mask overhang (see reveal.tsx).
const LINE_START = 120;
const RISE = 16;
/** What rises in under the title: the head (beside the decoding P/N), summary, title-block cells, layers. */
const RISERS =
  '.index-entry__head > :not([data-index="part"]), .index-entry__summary, [data-index="cell"], [data-index="layers"]';

type IndexProbe = { read?: () => { active: number; entered: number } };

declare global {
  interface Window {
    /** Test-only probe. Playwright sets an object in an init script; the index adds `read`. */
    __INDEX_PROBE__?: IndexProbe;
  }
}

export function IndexStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    (_, contextSafe) => {
      const root = ref.current;
      if (!root) return;
      const tokens = motionTokens();
      const { duration, stagger } = tokens;
      const q = <T extends HTMLElement = HTMLElement>(name: string, scope: ParentNode = root) => [
        ...scope.querySelectorAll<T>(`[data-index="${name}"]`),
      ];
      const entries = q("entry");
      const links = q<HTMLAnchorElement>("register-link");
      const readout = q("readout")[0];
      const progress = q("progress")[0];

      /* Register: the entry crossing the viewport's centre line is the one in view. */
      let active = -1;
      const setActive = (index: number) => {
        if (index === active || index < 0) return;
        active = index;
        links.forEach((link, i) => {
          if (i === index) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
        if (readout) readout.textContent = String(index + 1).padStart(2, "0");
        if (reduced && progress) gsap.set(progress, { scaleY: (index + 1) / entries.length });
      };
      entries.forEach((entry, i) =>
        ScrollTrigger.create({
          trigger: entry,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => self.isActive && setActive(i),
        }),
      );
      // Above the first entry the first part is current; below the last, the last.
      ScrollTrigger.create({
        trigger: root.querySelector(".work-index__list"),
        start: "top center",
        end: "bottom center",
        onLeaveBack: () => setActive(0),
        onLeave: () => setActive(entries.length - 1),
      });
      // Where the page already is (a reload, a fragment link): the entry across the centre line.
      const measure = () => {
        const centre = window.innerHeight / 2;
        const at = entries.findIndex((entry) => {
          const box = entry.getBoundingClientRect();
          return box.top <= centre && box.bottom > centre;
        });
        if (at >= 0) return setActive(at);
        const first = entries[0]?.getBoundingClientRect();
        setActive(first && first.top > centre ? 0 : entries.length - 1);
      };
      measure();
      ScrollTrigger.addEventListener("refresh", measure);

      const probe = window.__INDEX_PROBE__;
      let entered = 0;
      if (probe) probe.read = () => ({ active, entered });

      if (reduced) {
        delete root.dataset.mode;
        entries.forEach((entry) =>
          gsap.from(entry, {
            opacity: 0,
            duration: duration.reduced,
            ease: "none",
            scrollTrigger: { trigger: entry, start: "top 85%", once: true, onEnter: () => entered++ },
          }),
        );
        ScrollTrigger.refresh();
        return () => {
          ScrollTrigger.removeEventListener("refresh", measure);
          if (probe) delete probe.read;
        };
      }
      root.dataset.mode = "live";

      /* Header: the index rule draws in; the masthead sinks and dims as the page scrolls past it. */
      const header = root.querySelector<HTMLElement>(".work-index__header")!;
      gsap.to(q("index-rule"), { scaleX: 1, duration: duration.large, ease: EASE.machine });
      gsap.to(q("masthead"), {
        yPercent: 24,
        opacity: 0.2,
        ease: "none",
        scrollTrigger: { trigger: header, start: "top top", end: "bottom top", scrub: true },
      });

      /* Register progress: scroll-linked like a scrollbar. */
      if (progress) {
        gsap.fromTo(
          progress,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root.querySelector(".work-index__list"),
              start: "top center",
              end: "bottom center",
              scrub: true,
            },
          },
        );
      }

      /* Entries. */
      const restores: (() => void)[] = [];
      const scale = parseFloat(getComputedStyle(root).getPropertyValue("--work-cover-scale")) || 1;

      const play = contextSafe!((entry: HTMLElement) => {
        entered++;
        const part = q("part", entry)[0];
        const title = q("title", entry)[0];
        const strip = [...entry.querySelectorAll<HTMLElement>(".layer-strip__part")];
        const lit = strip.filter((plate) => plate.hasAttribute("data-lit"));
        const risers = entry.querySelectorAll(RISERS);

        lit.forEach((plate) => plate.removeAttribute("data-lit"));
        const decoder = createDecoder(part);
        decoder.scramble();
        const split = SplitText.create(title, {
          type: "lines",
          mask: "lines",
          tag: "span",
          linesClass: "reveal__line",
        });
        let splitLive = true;
        const unsplit = () => {
          if (splitLive) split.revert();
          splitLive = false;
        };
        restores.push(() => {
          lit.forEach((plate) => plate.setAttribute("data-lit", ""));
          decoder.restore();
          unsplit();
        });

        const tl = gsap.timeline({ defaults: { ease: EASE.settle } });
        tl.to(q("rule", entry), { scaleX: 1, duration: duration.medium, ease: EASE.machine })
          .to(
            q("shutter", entry),
            { scaleY: 0, duration: duration.large, ease: EASE.machine },
            duration.micro,
          )
          .to(part, { opacity: 1, duration: duration.micro, ease: EASE.snap }, duration.micro)
          .add(decoder.tween(duration.decode), "<")
          .set([title, q("arrow", entry)], { opacity: 1 }, duration.small)
          .from(
            split.lines,
            {
              yPercent: LINE_START,
              duration: duration.large,
              stagger: stagger.lines,
              // Unsplit once risen, so the title reflows with the page again.
              onComplete: unsplit,
            },
            duration.small,
          )
          .to(
            risers,
            { opacity: 1, y: 0, duration: duration.medium, stagger: stagger.items },
            duration.small,
          );
        // The plates light one after another as the layers row lands, in assembly order.
        const landed = duration.small + (risers.length - 1) * stagger.items + duration.small;
        lit.forEach((plate, i) =>
          tl.call(() => plate.setAttribute("data-lit", ""), undefined, landed + i * stagger.items * 2),
        );
      });

      entries.forEach((entry) => {
        // Hidden by the live stylesheet until played; the rise distance is set here, so CSS holds no motion values.
        gsap.set(entry.querySelectorAll(RISERS), { y: RISE });
        ScrollTrigger.create({
          trigger: entry,
          start: "top 80%",
          // Through the end of the page: an entry already scrolled past (a reload, a fragment link) still plays.
          end: "max",
          once: true,
          onEnter: () => play(entry),
        });

        const media = entry.querySelector<HTMLElement>('[data-cover="media"]');
        if (media) {
          gsap.fromTo(
            media,
            { scale },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: entry.querySelector(".index-entry__cover"),
                start: "top bottom",
                end: "center center",
                scrub: true,
              },
            },
          );
        }
      });

      ScrollTrigger.refresh();
      return () => {
        ScrollTrigger.removeEventListener("refresh", measure);
        restores.forEach((restore) => restore());
        delete root.dataset.mode;
        if (probe) delete probe.read;
      };
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="work-index" suppressHydrationWarning>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }}
      />
      {children}
    </div>
  );
}
