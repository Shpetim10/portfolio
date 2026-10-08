"use client";

import { useRef, type ReactNode } from "react";
import { LAYERS } from "@/components/chrome/nav";
import { createRig, frame, stack } from "@/components/three/choreography";
import { STATIC_BOX } from "@/components/three/InstrumentDrawing";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { useMagnetic } from "@/motion/hooks/useMagnetic";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * T13 · Contact — the Instrument reassembles (the hero's EXPLODE, reversed)
 * and its LED becomes the primary button's dot.
 *
 * Motion score
 *   trigger                         element          property            from → to                   ease     duration          mobile            reduced
 *   figure top 90% → centre 50%     plates           y (EXPLODE, rev.)   exploded → assembled        machine  scrubbed          same              shown assembled
 *   …same                           assembly         scale, x (framing)  fits, left → fills, centre  machine  scrubbed          same              —
 *   assembled (centre 50%), toggle  drawing LED      opacity             1 → 0                       snap     micro             same              LED already in the button
 *   …same                           traveller        x, y                LED → button dot            machine  medium (600ms)    same (short hop)  —
 *   …landed                         button dot       scale               0 → 1                       snap     micro             same              lit, still
 *   idle, once lit                  button dot       opacity             breathes                    machine  --led-cycle       same              still
 *   headline → 85% (Reveal)         display lines    yPercent (REVEAL)   120 → 0                     settle   large, lines      same              fade (200ms)
 * The hero moment: the last plate seats and the light drops into the button.
 * Scrolling back up reverses the hop, then pulls the parts apart again.
 * The hop measures both ends when it plays (layout, fonts and the magnetic pull
 * may have moved them), so it always lands. Only transforms and opacity move.
 */

/** The pose the server rendered (assembled) is the static state; live starts exploded. */
const MODE_LIVE = "live";

export function ContactStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useMagnetic(ref);

  useGSAP(
    () => {
      const station = ref.current;
      if (!station) return;
      const { duration } = motionTokens();
      const part = <T extends Element = HTMLElement>(name: string) =>
        station.querySelector<T>(`[data-contact="${name}"]`)!;

      if (reduced) {
        delete station.dataset.mode;
        gsap.from(station, {
          opacity: 0,
          duration: duration.reduced,
          ease: "none",
          scrollTrigger: { trigger: station, start: "top 85%", once: true },
        });
        return;
      }
      station.dataset.mode = MODE_LIVE;

      const figure = part("figure");
      const svg = figure.querySelector<SVGSVGElement>('[data-part="drawing"]')!;
      const assembly = svg.querySelector<SVGGElement>('[data-part="assembly"]')!;
      const plates = [...svg.querySelectorAll<SVGGElement>(".instrument-drawing__plate")];
      const led = svg.querySelector<SVGCircleElement>(".instrument-drawing__led")!;
      const traveller = part("traveller");
      const socket = part("socket");
      const cta = traveller.parentElement!;

      const original = {
        assembly: assembly.getAttribute("transform"),
        plates: plates.map((plate) => plate.getAttribute("transform")),
      };

      // Plates sit in paint order (base first) in the DOM; the rig's arrays run top plate first.
      const slot = plates.map((plate) => LAYERS.indexOf(plate.dataset.layer as (typeof LAYERS)[number]));
      const rig = createRig();
      const paint = (explode: number) => {
        stack(explode, rig.plates);
        frame(explode, STATIC_BOX.width, STATIC_BOX.height, true, rig.framing);
        const { scale, x, y } = rig.framing;
        assembly.setAttribute(
          "transform",
          `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})`,
        );
        plates.forEach((plate, i) =>
          plate.setAttribute("transform", `translate(0 ${rig.plates[slot[i]].toFixed(2)})`),
        );
      };

      /* Reassembly, scrubbed ---------------------------------------------- */
      const pose = { explode: 1 };
      paint(1);
      gsap.to(pose, {
        explode: 0,
        ease: EASE.machine,
        onUpdate: () => paint(pose.explode),
        scrollTrigger: { trigger: figure, start: "top 90%", end: "center 50%", scrub: true },
      });

      /* LED hand-over, played / reversed at the assembled pose -------------- */
      // Centre of `element` in the CTA box's coordinates, minus the traveller's own half size.
      const centreIn = (element: Element) => {
        const box = element.getBoundingClientRect();
        const origin = cta.getBoundingClientRect();
        const half = traveller.offsetWidth / 2;
        return {
          x: box.left + box.width / 2 - origin.left - half,
          y: box.top + box.height / 2 - origin.top - half,
        };
      };

      gsap.set(socket, { scale: 0 });
      const hop = gsap
        .timeline({
          paused: true,
          onComplete: () => station.toggleAttribute("data-lit", true),
          // Back on the Instrument: it breathes there again (CSS keys the idle on data-hop).
          onReverseComplete: () => station.removeAttribute("data-hop"),
        })
        .set(traveller, { opacity: 1 })
        .to(led, { opacity: 0, duration: duration.micro, ease: EASE.snap }, 0)
        .fromTo(
          traveller,
          { x: () => centreIn(led).x, y: () => centreIn(led).y },
          {
            x: () => centreIn(socket).x,
            y: () => centreIn(socket).y,
            duration: duration.medium,
            ease: EASE.machine,
          },
          0,
        )
        .to(socket, { scale: 1, duration: duration.micro, ease: EASE.snap })
        .to(traveller, { opacity: 0, duration: duration.micro, ease: EASE.snap }, "<");

      ScrollTrigger.create({
        trigger: figure,
        start: "center 50%",
        // Measure both ends as it plays: layout, fonts and the magnetic pull may have moved them.
        onEnter: () => {
          station.toggleAttribute("data-hop", true);
          hop.invalidate().play();
        },
        onLeaveBack: () => {
          station.removeAttribute("data-lit");
          hop.reverse();
        },
      });

      return () => {
        if (original.assembly) assembly.setAttribute("transform", original.assembly);
        plates.forEach((plate, i) => {
          const transform = original.plates[i];
          if (transform) plate.setAttribute("transform", transform);
        });
        station.removeAttribute("data-lit");
        station.removeAttribute("data-hop");
        delete station.dataset.mode;
      };
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="contact__station">
      {children}
    </div>
  );
}
