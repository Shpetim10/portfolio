"use client";

import { gsap } from "@/motion/gsap";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * BRAND-01 · The drawable Sh² mark (<Logo drawable>) drawing itself in.
 * The strokes are dashes on the mask's centrelines (pathLength 1): the ink
 * itself never moves, the mask uncovers it. Both helpers hide the mark at
 * once and hand back a reset that leaves the plain, finished mark.
 *
 * drawMark: the header, on the first load of a tab session (after the
 * preloader, src/components/chrome/SiteHeader.tsx).
 *   Motion score (--logo-draw 300ms, --logo-breath 360ms; ends at 0.96s)
 *   at      element                    property                ease            duration
 *   0       S upper arc (mask)         dash 1 → 0              settle          draw
 *   draw    h stem, rising (mask)      dash 1 → 0              machine         draw
 *   +items  S squared bowl, h arch     dash 1 → 0              machine         draw
 *   2×draw  exponent square            opacity 0 → 1 → .5 → 1  snap / settle   breath, in thirds
 *   Reduced motion and repeat visits: no motion, the static mark.
 *
 * scrubMark: the preloader, driven by its calibration count (0–1): the same
 * strokes in the same order, over PHASES of the count. The square is the
 * preloader's LED and stays the preloader's to light.
 */

const seconds = (value: string) =>
  value.trim().endsWith("ms") ? parseFloat(value) / 1000 : parseFloat(value);

/** Share of a scrubbed draw each stroke spans: the arc, the stem, then the squared bowl and arch together. */
const PHASES: Record<string, [number, number]> = {
  arc: [0, 0.4],
  stem: [0.4, 0.65],
  bowl: [0.6, 1],
  arch: [0.6, 1],
};

/** Dashes every centreline of the mark's mask fully off; returns them and the reset. */
function prepare(svg: SVGSVGElement) {
  const lines = [...svg.querySelectorAll<SVGPathElement>("[data-draw]")];
  for (const path of lines) {
    path.setAttribute("pathLength", "1");
    path.setAttribute("stroke-dasharray", "1 1");
    path.setAttribute("stroke-dashoffset", "1");
  }
  const reset = () => {
    for (const path of lines) {
      path.removeAttribute("pathLength");
      path.removeAttribute("stroke-dasharray");
      path.removeAttribute("stroke-dashoffset");
    }
  };
  return { lines, reset };
}

/** Hides the drawable mark's strokes; `paint(progress)` draws them through 0–1. */
export function scrubMark(svg: SVGSVGElement) {
  const { lines, reset } = prepare(svg);
  const paint = (progress: number) => {
    for (const path of lines) {
      const [from, to] = PHASES[path.dataset.draw!];
      const drawn = Math.min(Math.max((progress - from) / (to - from), 0), 1);
      path.setAttribute("stroke-dashoffset", String(1 - drawn));
    }
  };
  return { paint, reset };
}

/** Hides the drawable mark at once and draws it in after `delay` seconds. Returns the cleanup. */
export function drawMark(svg: SVGSVGElement, delay = 0) {
  const line = (part: string) => svg.querySelector<SVGPathElement>(`[data-draw="${part}"]`)!;
  const exponent = svg.querySelector<SVGPathElement>('[data-part="exponent"]')!;

  const style = getComputedStyle(svg);
  const draw = seconds(style.getPropertyValue("--logo-draw"));
  const breath = seconds(style.getPropertyValue("--logo-breath")) / 3;
  const { stagger } = motionTokens();

  const strokes = prepare(svg);
  const reset = () => {
    strokes.reset();
    gsap.set(exponent, { clearProps: "opacity" });
  };
  gsap.set(exponent, { opacity: 0 });

  const drawn = { attr: { "stroke-dashoffset": 0 }, duration: draw };
  const timeline = gsap
    .timeline({ delay, onComplete: reset })
    .to(line("arc"), { ...drawn, ease: EASE.settle }, 0)
    .to(line("stem"), { ...drawn, ease: EASE.machine }, draw)
    .to([line("bowl"), line("arch")], { ...drawn, ease: EASE.machine }, draw + stagger.items)
    .to(exponent, { opacity: 1, duration: breath, ease: EASE.snap }, 2 * draw)
    .to(exponent, { opacity: 0.5, duration: breath, ease: EASE.settle })
    .to(exponent, { opacity: 1, duration: breath, ease: EASE.settle });

  return () => {
    timeline.kill();
    reset();
  };
}
