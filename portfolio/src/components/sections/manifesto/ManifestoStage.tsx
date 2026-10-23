"use client";

import { createContext, useContext, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { annotateLeader } from "@/motion/signatures/annotate";
import { calibrateCounter } from "@/motion/signatures/calibrate";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * T04c · Manifesto with Winged Victory + signature block — choreography.
 *
 * One progress value p (0 → 1) drives the section:
 *   desktop  the stage (manifesto + Victory) is sticky inside a track
 *            --manifesto-pin taller than itself; p runs over that pin.
 *   compact  no pin: Victory is a sticky band; p runs from the section's top
 *            at the viewport top until the last line passes the viewport centre.
 *
 * Motion score
 *   trigger                element          property            from → to                   ease      duration       compact             reduced
 *   p 0 → .88, scrubbed    each word        opacity             unread → 1, a soft front    smooth    scrubbed       same                bone, static
 *   p 0 → word N lit       Victory          sculpture progress  0 → 1 (wings last)          (engine)  scrubbed       same (mobile grid)  final <pre>
 *   p ≥ .90, both ways     wing annotation  ANNOTATE            hidden → drawn              settle    small+decode   static label fade   drawn, static
 *   portrait top at 75%    plaque           one timeline, once (≤ 1.6s):                                                     the plaque fades in · reduced
 *                            rules, eyebrow   scaleX · opacity    0 → 1 from the words         machine   medium         same
 *                            mount            y · opacity         --hall-lift → 0              settle    medium         same
 *                            cover plate      scaleY              1 → 0 (top first)            machine   large          same
 *                            photo            scale               --hall-settle-scale → 1      settle    large          same
 *                            corner marks     scale · rotate      0, -90° → 1, 0 (staggered)   settle    small          same
 *                            nameplate        y · opacity         half the lift → 0            settle    medium         same
 *                            tenure figures   CALIBRATE count     0 → years, 0 → months        settle    large          same
 *                            month scale      scaleY              0 → 1 (left → right)         settle    small          same
 *                            signed line      scaleX · opacity    0 → 1                        machine   medium         same
 *
 * Sync: Victory reaches 1 exactly when the last word of the final sentence is
 * fully lit — computed from that word's index (formedAt), not a fixed number.
 * Both read the same p in the same ScrollTrigger update, so no scroll speed,
 * in either direction, can split them.
 *
 * Pin: CSS sticky, like the hero (T03). No ScrollTrigger pin, no pin-spacer:
 * nothing reparents, the track's height is CSS from the first paint (the mode
 * script below), and every trigger on the page — the hero's above, the
 * sections' below — measures real layout, so refresh order cannot matter. The
 * only layout change after first paint (reduced motion dropping the live mode)
 * is followed by one ScrollTrigger.refresh().
 *
 * Contrast: words never drop below --manifesto-unread (bone at that opacity
 * over carbon ≥ 3:1, AA for this ≥ 24px text). Without JS, all bone.
 */

const DESKTOP = "(width >= 64rem)";
const COMPACT = "(width < 64rem)";

/** p at which the word highlight completes. */
const TEXT_END = 0.88;
/** p from which the wing annotation is drawn. */
const NOTE_AT = 0.9;
/** Width of the lighting front, in words: a word ramps up as the next few start to. */
const SOFT = 3;

/** Runs before first paint: full motion gets the pinned / sticky layout at once, so nothing shifts on hydration. */
const MODE_SCRIPT = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.currentScript.parentElement.dataset.mode="live"}catch(e){}`;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

type ManifestoProbe = {
  read?: () => {
    p: number;
    sculpture: number;
    formedAt: number;
    noted: boolean;
    /** Scroll positions where p is 0 and 1. */
    start: number;
    end: number;
  };
};

declare global {
  interface Window {
    /** Test-only probe. Playwright sets an object in an init script; the manifesto adds `read`. */
    __MANIFESTO_PROBE__?: ManifestoProbe;
  }
}

/* Progress store ------------------------------------------------------ */
/* Victory's progress, outside React state so only the sculpture leaf re-renders. */

type ProgressStore = {
  get: () => number;
  set: (value: number) => void;
  subscribe: (listener: () => void) => () => void;
};

function createProgressStore(): ProgressStore {
  let value = 1; // the final figure until the stage says otherwise (static, reduced, no JS)
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (next === value) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const ProgressContext = createContext<ProgressStore | null>(null);

/** Victory's assembly progress, 0 → 1. */
export function useManifestoProgress(): number {
  const store = useContext(ProgressContext);
  if (!store) throw new Error("useManifestoProgress must be used inside ManifestoStage");
  return useSyncExternalStore(store.subscribe, store.get, () => 1);
}

/* Stage --------------------------------------------------------------- */

export function ManifestoStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [store] = useState(createProgressStore);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const part = (name: string) => root.querySelector<HTMLElement>(`[data-manifesto="${name}"]`)!;
      const portrait = part("portrait");
      const tokens = motionTokens();
      const { duration, stagger } = tokens;
      const once = (trigger: Element, start = "top 75%") => ({ trigger, start, once: true });

      if (reduced) {
        delete root.dataset.mode;
        store.set(1);
        gsap.from(part("signature"), {
          opacity: 0,
          duration: duration.reduced,
          ease: "none",
          scrollTrigger: once(portrait),
        });
        ScrollTrigger.refresh(); // the pin's track and the sticky band are gone: re-measure everything below
        return;
      }
      root.dataset.mode = "live";

      /* Words: lit in reading order as p runs 0 → TEXT_END. */
      const token = (name: string) => parseFloat(getComputedStyle(root).getPropertyValue(name));
      const unread = token("--manifesto-unread") || 1;
      const words = gsap.utils.toArray<HTMLElement>('[data-manifesto="word"]', root);
      const setters = words.map((word) => gsap.quickSetter(word, "opacity") as (value: number) => void);
      const shown = words.map(() => -1);
      const reach = Math.max(words.length - 1, 0) + SOFT; // the front's travel, in words
      /** p at which word `index` is fully lit. */
      const litAt = (index: number) => (TEXT_END * (index + SOFT)) / reach;
      const formedAt = litAt(words.length - 1); // Victory completes with the last word of the final sentence

      /* The wing annotation: drawn on desktop, a static label on compact. */
      const spec = part("spec");
      let note: gsap.core.Timeline | null = null;
      let noted = false;
      const resetNote = (timeline: gsap.core.Timeline | null) => {
        note = timeline;
        noted = false;
        spec.removeAttribute("data-shown");
      };

      let p = 0;
      const apply = (progress: number) => {
        p = progress;
        const front = (Math.min(p, TEXT_END) / TEXT_END) * reach;
        words.forEach((_, i) => {
          const lit = smoothstep(gsap.utils.clamp(0, 1, (front - i) / SOFT));
          const value = Math.round((unread + (1 - unread) * lit) * 1000) / 1000;
          if (value !== shown[i]) setters[i]((shown[i] = value));
        });
        store.set(Math.round(gsap.utils.clamp(0, 1, p / formedAt) * 10000) / 10000);

        const show = p >= NOTE_AT;
        if (show !== noted) {
          noted = show;
          spec.toggleAttribute("data-shown", show);
          if (show) note?.play();
          else note?.reverse();
        }
      };
      let active: ScrollTrigger | null = null;
      const track = (vars: ScrollTrigger.Vars) =>
        (active = ScrollTrigger.create({
          ...vars,
          onUpdate: (self) => apply(self.progress),
          onRefresh: (self) => apply(self.progress),
        }));

      const mm = gsap.matchMedia();

      mm.add(DESKTOP, () => {
        const pin = part("track");
        const stage = part("stage");
        const header = token("--header-height") || 0;
        // Sticks under the header; a stage taller than the viewport sticks by its bottom edge instead.
        let stick = header;
        const place = () => {
          stick = Math.min(header, window.innerHeight - stage.offsetHeight);
          root.style.setProperty("--manifesto-stick", `${stick}px`);
        };
        ScrollTrigger.addEventListener("refreshInit", place);
        place();

        const leader = part("figure").querySelector<HTMLElement>('[data-anim="annotate"]')!;
        const built = annotateLeader(leader, tokens);
        resetNote(built.timeline.pause(0));

        const trigger = track({
          trigger: pin,
          start: () => `top top+=${stick}`,
          end: () => `+=${Math.max(pin.offsetHeight - stage.offsetHeight, 1)}`,
        });
        apply(trigger.progress);

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", place);
          root.style.removeProperty("--manifesto-stick");
          built.restore();
          resetNote(null);
        };
      });

      mm.add(COMPACT, () => {
        const lines = gsap.utils.toArray<HTMLElement>('[data-manifesto="line"]', root);
        resetNote(null);
        const trigger = track({
          trigger: root.closest("section") ?? root,
          start: "top top",
          endTrigger: lines.at(-1) ?? root,
          end: "bottom center",
        });
        apply(trigger.progress);
      });

      /* Plaque: the mount rises, the plate drops away top → bottom while the photo
         settles, the corners lock on, then the nameplate, its figures and the signature. */
      const all = (name: string) => gsap.utils.toArray<HTMLElement>(`[data-manifesto="${name}"]`, root);
      const lift =
        token("--hall-lift") * parseFloat(getComputedStyle(document.documentElement).fontSize) || 0; // rem → px
      const settleScale = token("--hall-settle-scale") || 1;
      const counters: ReturnType<typeof calibrateCounter>[] = [];
      gsap
        .timeline({ scrollTrigger: once(portrait), defaults: { ease: EASE.settle } })
        .from(all("rule"), { scaleX: 0, duration: duration.medium, ease: EASE.machine }, 0)
        .from(part("eyebrow"), { opacity: 0, duration: duration.small }, 0)
        .from(part("mount"), { y: lift, opacity: 0, duration: duration.medium }, 0)
        .fromTo(
          part("plate"),
          { scaleY: 1 },
          { scaleY: 0, duration: duration.large, ease: EASE.machine },
          0.1,
        )
        .from(all("media"), { scale: settleScale, duration: duration.large }, 0.1)
        .from(
          all("corner"),
          { opacity: 0, scale: 0, rotate: -90, duration: duration.small, stagger: stagger.items },
          0.3,
        )
        .from(part("plaque"), { y: lift / 2, opacity: 0, duration: duration.medium }, 0.45)
        .from(part("bar"), { scaleX: 0, duration: duration.small, ease: EASE.machine }, 0.7)
        .add(() => {
          // The figures count up as the nameplate rises, so they land with the rest.
          all("plaque")
            .flatMap((plaque) => [...plaque.querySelectorAll<HTMLElement>('[data-anim="calibrate"]')])
            .forEach((counter) => counters.push(calibrateCounter(counter, tokens)));
        }, 0.45)
        .from(all("tick"), { scaleY: 0, duration: duration.small, stagger: { amount: duration.small } }, 0.7)
        .from(part("line-sign"), { scaleX: 0, duration: duration.medium, ease: EASE.machine }, 0.8)
        .from(part("sign"), { opacity: 0, duration: duration.medium }, 0.8);

      const probe = window.__MANIFESTO_PROBE__;
      if (probe)
        probe.read = () => ({
          p,
          sculpture: store.get(),
          formedAt,
          noted,
          start: active?.start ?? 0,
          end: active?.end ?? 0,
        });

      return () => {
        mm.revert();
        counters.forEach(({ tween, restore }) => {
          tween.kill(); // started from a timeline callback, outside the context
          restore();
        });
        delete root.dataset.mode;
        resetNote(null);
        gsap.set(words, { clearProps: "opacity" }); // quickSetter writes aren't reverted by the context
        store.set(1);
        if (probe) delete probe.read;
      };
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <ProgressContext.Provider value={store}>
      <div ref={ref} className="manifesto" suppressHydrationWarning>
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }}
        />
        {children}
      </div>
    </ProgressContext.Provider>
  );
}
