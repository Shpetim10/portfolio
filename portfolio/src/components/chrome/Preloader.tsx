"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/motion/gsap";
import { PRELOADER_FLAG, releaseIntro, watchPreload } from "@/motion/preload";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * T01 · Preloader — CALIBRATE, first visit per tab session only.
 *
 * Motion score
 *   trigger        element        property           from → to         ease     duration          mobile         reduced
 *   hydrate        readout        text 000 → 100     real progress     none     1.0–1.5s          0.6–0.9s       hidden
 *   hydrate        gauge rule     scaleX             0 → progress      none     (with readout)    same           full, static
 *   100            signal LED     opacity            0 → 1, ×2 blink   none     micro/2 per edge  same           —
 *   exit           readout, ticks opacity            1 → 0             snap     micro             same           —
 *   exit           gauge rule     x, y, scaleX       gauge → horizon   machine  large (1000ms)    same           —
 *   exit           screen         opacity            1 → 0             machine  medium, ends with rule        —
 *   ready | cap    whole overlay  opacity            1 → 0             none     —                 —              reduced (200ms)
 *   key/tap/wheel  whole overlay  opacity            1 → 0             none     reduced (200ms)   same           same
 *
 * The readout never runs ahead of the real work (src/motion/preload.ts) and never
 * finishes before the minimum count, so it reads as a sequence, not a flash.
 *
 * Blocking cap (--preloader-cap, 2.5s from navigation start): the count is cut
 * short so the exit always starts inside it; the overlay is pointer-transparent
 * from the moment the exit starts. Without JS, or if hydration lands past the
 * cap, a CSS failsafe hides the overlay at the cap (src/styles/preloader.css).
 *
 * The exit lands the rule on the hero's horizon line, `[data-horizon]` (T03).
 * Until a page provides one, the rule runs out to the full viewport width and fades.
 */

/** Count phase in seconds, before the LED blink. Desktop sequence ≈ 1.27–1.77s, mobile ≤ 1.2s. */
const COUNT = {
  regular: { min: 1, max: 1.5 },
  compact: { min: 0.6, max: 0.9 },
};
const COMPACT_QUERY = "(width < 48rem)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const SKIP_EVENTS = ["keydown", "pointerdown", "wheel", "touchstart"] as const;

/** Runs before first paint: a repeat visit in this tab session never shows the overlay. */
const SKIP_SCRIPT = `try{if(sessionStorage.getItem(${JSON.stringify(PRELOADER_FLAG)})){var p=document.getElementById("preloader");if(p)p.dataset.state="skip"}}catch(e){}`;

/** "2500ms" | "2.5s" → seconds. */
const toSeconds = (value: string) =>
  value.trim().endsWith("ms") ? parseFloat(value) / 1000 : parseFloat(value);

const readout = (progress: number) => String(Math.round(progress * 100)).padStart(3, "0");

export function Preloader() {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    (_, contextSafe) => {
      const root = ref.current;
      if (!root || !contextSafe) return;

      const finish = () => {
        releaseIntro();
        setDone(true);
      };

      // Repeat visit (inline script), or JS arrived after the CSS failsafe already hid it.
      const budget =
        toSeconds(getComputedStyle(root).getPropertyValue("--preloader-cap")) - performance.now() / 1000;
      if (root.dataset.state === "skip" || !(budget > 0)) {
        finish();
        return;
      }

      try {
        sessionStorage.setItem(PRELOADER_FLAG, "1");
      } catch {
        // Storage blocked: the preloader simply runs again on the next hard load.
      }
      root.dataset.state = "live"; // JS owns the timing now; the CSS failsafe stands down.

      const { duration } = motionTokens();
      const q = <T extends Element = HTMLElement>(part: string) =>
        root.querySelector<T>(`[data-part="${part}"]`)!;
      const value = q("value");
      const rule = q("rule");
      const led = q("led");
      const reduced = window.matchMedia(REDUCED_QUERY).matches;
      const blink = (duration.micro / 2) * 3; // off→on→off→on: two blinks, LED left lit

      let stopWatching = () => {};
      let exiting = false;
      let count: gsap.core.Tween | null = null;

      const removeSkip = () => SKIP_EVENTS.forEach((type) => window.removeEventListener(type, onSkip));

      const exit = contextSafe((quick: boolean) => {
        if (exiting) return;
        exiting = true;
        removeSkip();
        stopWatching();
        count?.kill();
        gsap.ticker.remove(tick);
        root.dataset.state = "exit";
        releaseIntro();

        if (quick) {
          gsap.to(root, { opacity: 0, duration: duration.reduced, ease: "none", onComplete: finish });
          return;
        }

        // Land the rule (transform-origin: left) on the hero's horizon, or run it out to the viewport edges.
        const from = rule.getBoundingClientRect();
        const horizon = document.querySelector("[data-horizon]")?.getBoundingClientRect();
        const to =
          horizon && horizon.width > 0
            ? {
                x: horizon.left - from.left,
                y: horizon.top + horizon.height / 2 - (from.top + from.height / 2),
                scaleX: horizon.width / from.width,
              }
            : { x: -from.left, y: 0, scaleX: window.innerWidth / from.width };

        const tl = gsap.timeline({ onComplete: finish });
        tl.to(q("readout"), { opacity: 0, duration: duration.micro, ease: EASE.snap }, 0)
          .to(
            root.querySelectorAll('[data-part="tick"]'),
            { opacity: 0, duration: duration.micro, ease: EASE.snap },
            0,
          )
          .to(rule, { ...to, duration: duration.large, ease: EASE.machine }, 0)
          .to(
            q("screen"),
            { opacity: 0, duration: duration.medium, ease: EASE.machine },
            duration.large - duration.medium,
          );
        // No horizon to hand over to: the line clears with the screen.
        if (!horizon)
          tl.to(rule, { opacity: 0, duration: duration.small, ease: EASE.settle }, duration.large);
      });

      const onSkip = () => exit(true);
      SKIP_EVENTS.forEach((type) => window.addEventListener(type, onSkip, { passive: true }));

      // Reduced: nothing counts — hold the static screen until the work is done (or the cap), then fade.
      if (reduced) {
        const cap = gsap.delayedCall(Math.min(COUNT.compact.max + blink, budget), () => exit(true));
        stopWatching = watchPreload((settled, total) => {
          if (settled >= total) {
            cap.kill();
            exit(true);
          }
        });
        return () => {
          removeSkip();
          stopWatching();
        };
      }

      // Not enough budget left for a sequence (very late hydration): get out of the way.
      const span = COUNT[window.matchMedia(COMPACT_QUERY).matches ? "compact" : "regular"];
      const maxCount = Math.min(span.max, budget - blink);
      if (maxCount < duration.small) {
        exit(true);
        return removeSkip;
      }
      const minCount = Math.min(span.min, maxCount);

      const paint = gsap.quickSetter(rule, "scaleX");
      const state = { shown: 0 };
      let real = 0;
      const start = gsap.ticker.time;

      const render = () => {
        value.textContent = readout(state.shown);
        paint(state.shown);
      };

      const complete = contextSafe(() => {
        gsap.ticker.remove(tick);
        stopWatching();
        state.shown = 1;
        render();
        gsap
          .timeline({ onComplete: () => exit(false) })
          .fromTo(
            led,
            { opacity: 0 },
            { opacity: 1, duration: duration.micro / 2, ease: "none", repeat: 2, yoyo: true },
          );
      });

      // Deadline: whatever is still loading, finish the count on a short settle.
      const forceFinish = contextSafe(() => {
        gsap.ticker.remove(tick);
        count = gsap.to(state, {
          shown: 1,
          duration: duration.small,
          ease: EASE.settle,
          onUpdate: render,
          onComplete: complete,
        });
      });

      function tick() {
        const elapsed = gsap.ticker.time - start;
        if (elapsed >= maxCount - duration.small) return forceFinish();
        // Linear against the clock: a calibration reads at a steady rate, gated by real progress.
        const target = Math.min(elapsed / minCount, 1, real);
        if (target > state.shown) {
          state.shown = target;
          render();
        }
        if (state.shown >= 1) complete();
      }

      stopWatching = watchPreload((settled, total) => {
        real = total ? settled / total : 1;
      });
      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
        removeSkip();
        stopWatching();
      };
    },
    { scope: ref },
  );

  if (done) return null;

  return (
    <div id="preloader" ref={ref} className="preloader" aria-hidden="true" suppressHydrationWarning>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: SKIP_SCRIPT }}
      />
      <noscript>
        <style>{".preloader{display:none}"}</style>
      </noscript>
      <div className="preloader__screen" data-part="screen" />
      <div className="preloader__instrument">
        <p className="preloader__readout" data-part="readout">
          <span className="preloader__led">
            <span className="preloader__led-light" data-part="led" />
          </span>
          <span>Calibrating</span>
          <span className="preloader__value" data-part="value">
            000
          </span>
        </p>
        <div className="preloader__gauge">
          <span className="preloader__tick" data-part="tick" />
          <span className="preloader__rule" data-part="rule" />
          <span className="preloader__tick preloader__tick--end" data-part="tick" />
        </div>
      </div>
    </div>
  );
}
