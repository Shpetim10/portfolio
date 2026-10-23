"use client";

import { createContext, useContext, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createDecoder } from "@/motion/decode";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { annotateLeader } from "@/motion/signatures/annotate";
import { EASE, motionTokens, type MotionTokens } from "@/motion/tokens";

/*
 * T09d · Proportion — choreography. One progress value p (0 → 1), straight to
 * GlyphLineDrawing.
 *
 * Hold: the band is a track --proportion-hold taller than the screen, and the
 * figure (drawing, notes, caption) is a full-screen stage that sticks inside it
 * — CSS sticky, like the hero and the manifesto: no ScrollTrigger pin, no
 * pin-spacer, and the scroll itself never stops or slows (it moves 1:1; only
 * the stage stays put). p runs from the track's top at 85% of the viewport to
 * the end marker, --proportion-dwell before the stage releases. The stage
 * sticks before p reaches .45, so the whole figure forms while it is still,
 * and the finished drawing is held for the dwell before it scrolls on.
 * The track's height is CSS from the first paint (the mode script below);
 * reduced motion drops it, followed by one ScrollTrigger.refresh().
 *
 * Motion score
 *   trigger               element         property            from → to          ease      duration      compact                    reduced
 *   p 0 → 1, scrubbed     drawing         progress            0 → 1              (engine)  scrubbed      same (mobile grid < md)    final state
 *   p ≥ .30, both ways    PRACTICE note   ANNOTATE            hidden → drawn     settle    small+decode  vertical leader, same      drawn, static
 *   p ≥ .55, both ways    THEORY note     ANNOTATE            hidden → drawn     settle    small+decode  vertical leader, same      drawn, static
 *   —                     hairlines       —                   static, always drawn
 *
 * .30 is where the square closes, .55 where the circle does (T09c's sequence).
 * A note holding keyboard focus stays drawn whatever p is, so a link is never
 * focused while invisible. Without JS: the final drawing, both notes drawn.
 */

/** Runs before first paint: full motion gets the tall track at once, so nothing below shifts on hydration. */
const MODE_SCRIPT = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.currentScript.parentElement.dataset.mode="live"}catch(e){}`;

const DESKTOP = "(width >= 64rem)";
const COMPACT = "(width < 64rem)";

/** p at which each note is drawn: the square complete, then the circle. */
const NOTE_AT = { practice: 0.3, theory: 0.55 } as const;
type NoteName = keyof typeof NOTE_AT;

type ProportionProbe = {
  read?: () => { p: number; drawing: number; shown: Record<NoteName, boolean>; start: number; end: number };
  /** Holds p at a value whatever the scroll (null releases it), so a test can frame the whole band at one p. */
  hold?: (value: number | null) => void;
};

declare global {
  interface Window {
    /** Test-only probe. Playwright sets an object in an init script; the bridge adds `read`. */
    __PROPORTION_PROBE__?: ProportionProbe;
  }
}

/* Progress store ------------------------------------------------------ */
/* The drawing's progress, outside React state so only the drawing leaf re-renders. */

type ProgressStore = {
  get: () => number;
  set: (value: number) => void;
  subscribe: (listener: () => void) => () => void;
};

function createProgressStore(): ProgressStore {
  let value = 1; // the final drawing until the stage says otherwise (reduced, no JS)
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

/** The drawing's progress, 0 → 1. */
export function useProportionProgress(): number {
  const store = useContext(ProgressContext);
  if (!store) throw new Error("useProportionProgress must be used inside ProportionStage");
  return useSyncExternalStore(store.subscribe, store.get, () => 1);
}

/* Compact note -------------------------------------------------------- */

/**
 * ANNOTATE on a vertical leader: the stroke draws out of its target (the
 * square's top, the circle's bottom), the dot lands, the label decodes.
 */
function annotateStem(stem: HTMLElement, { duration }: MotionTokens) {
  const part = (name: string) => stem.querySelector<HTMLElement>(`[data-anim-part="${name}"]`)!;
  const label = part("label");
  const decoder = createDecoder(label);
  decoder.scramble();
  const timeline = gsap
    .timeline()
    .from(part("stroke"), {
      scaleY: 0,
      // PRACTICE's target is below its label, THEORY's above.
      transformOrigin: stem.dataset.note === "practice" ? "center bottom" : "center top",
      duration: duration.small,
      ease: EASE.settle,
    })
    .from(part("dot"), { scale: 0, duration: duration.micro, ease: EASE.snap })
    .from(label, { opacity: 0, duration: duration.micro, ease: EASE.snap }, "<")
    .add(decoder.tween(duration.decode), "<");
  return { timeline, restore: decoder.restore };
}

/* Stage --------------------------------------------------------------- */

export function ProportionStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [store] = useState(createProgressStore);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      if (reduced) {
        delete root.dataset.mode;
        store.set(1);
        ScrollTrigger.refresh(); // the track is gone: re-measure everything below
        return;
      }
      root.dataset.mode = "live";
      const tokens = motionTokens();

      type Note = { timeline: gsap.core.Timeline | null; shown: boolean; focused: boolean };
      const notes: Record<NoteName, Note> = {
        practice: { timeline: null, shown: true, focused: false },
        theory: { timeline: null, shown: true, focused: false },
      };
      const names = Object.keys(NOTE_AT) as NoteName[];

      let p = 0;
      let held: number | null = null;
      const sync = () => {
        names.forEach((name) => {
          const note = notes[name];
          const show = p >= NOTE_AT[name] || note.focused;
          if (show === note.shown) return;
          note.shown = show;
          if (show) note.timeline?.play();
          else note.timeline?.reverse();
        });
      };
      const apply = (progress: number) => {
        p = held ?? progress;
        store.set(Math.round(p * 10000) / 10000);
        sync();
      };

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top 85%",
        endTrigger: root.querySelector('[data-proportion="end"]'),
        end: "top bottom",
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => apply(self.progress),
      });

      /** Builds this breakpoint's notes, hidden, then lets p decide which are drawn. */
      const build = (selector: string, annotateNote: typeof annotateStem) => {
        const built = names.map((name) => {
          const element = root.querySelector<HTMLElement>(`${selector}[data-note="${name}"]`)!;
          const { timeline, restore } = annotateNote(element, tokens);
          notes[name].timeline = timeline.pause(0);
          notes[name].shown = false;
          return restore;
        });
        sync();
        return () => {
          built.forEach((restore) => restore());
          names.forEach((name) => Object.assign(notes[name], { timeline: null, shown: true }));
        };
      };

      const mm = gsap.matchMedia();
      mm.add(DESKTOP, () => build(".proportion__leader", annotateLeader));
      mm.add(COMPACT, () => build(".proportion__stem", annotateStem));

      // Keyboard focus on a link keeps its note drawn.
      const focusOf = (event: FocusEvent, focused: boolean) => {
        const name = (event.target as Element).closest<HTMLElement>("[data-note]")?.dataset.note as NoteName;
        if (!notes[name]) return;
        notes[name].focused = focused;
        sync();
      };
      const onFocusIn = (event: FocusEvent) => focusOf(event, true);
      const onFocusOut = (event: FocusEvent) => focusOf(event, false);
      root.addEventListener("focusin", onFocusIn);
      root.addEventListener("focusout", onFocusOut);

      const probe = window.__PROPORTION_PROBE__;
      if (probe) {
        probe.read = () => ({
          p,
          drawing: store.get(),
          shown: { practice: notes.practice.shown, theory: notes.theory.shown },
          start: trigger.start,
          end: trigger.end,
        });
        probe.hold = (value) => {
          held = value;
          apply(trigger.progress);
        };
      }

      return () => {
        mm.revert();
        root.removeEventListener("focusin", onFocusIn);
        root.removeEventListener("focusout", onFocusOut);
        delete root.dataset.mode;
        store.set(1);
        if (probe) {
          delete probe.read;
          delete probe.hold;
        }
      };
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <ProgressContext.Provider value={store}>
      {/* No index: the bridge is not a section. The section indicator names it alone. */}
      <aside
        ref={ref}
        aria-label="Proportion"
        className="proportion layout-grid"
        data-indicator-title="Proportion"
        suppressHydrationWarning
      >
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }}
        />
        {children}
        {/* Where p reaches 1: --proportion-dwell above the track's end. */}
        <span className="proportion__end" data-proportion="end" aria-hidden="true" />
      </aside>
    </ProgressContext.Provider>
  );
}
