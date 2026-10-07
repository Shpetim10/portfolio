"use client";

import { useEffect, type RefObject } from "react";
import { gsap } from "../gsap";
import { EASE, motionTokens } from "../tokens";
import { useMediaQuery } from "./useMediaQuery";
import { useReducedMotion } from "./useReducedMotion";

export const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/**
 * Magnetic pull: `[data-magnetic]` elements in the scope (and the scope itself,
 * if marked) lean toward the pointer, up to --magnet-max (6px) at their edges,
 * and settle back when it leaves. settle · small (320ms).
 *
 * Writes the CSS `translate` property, which composes with the element's own
 * `transform` (e.g. the Button press), so the two never fight.
 * Off on touch / coarse pointers and under reduced motion (no movement at all).
 */
export function useMagnetic(ref: RefObject<HTMLElement | null>, selector = "[data-magnetic]") {
  const finePointer = useMediaQuery(FINE_POINTER);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const scope = ref.current;
    if (!scope || !finePointer || prefersReduced) return;
    const { magnetMax, duration } = motionTokens();
    const targets = [
      ...(scope.matches(selector) ? [scope] : []),
      ...scope.querySelectorAll<HTMLElement>(selector),
    ];

    const detach = targets.map((element) => {
      const pull = { x: 0, y: 0 };
      const apply = () => {
        element.style.translate = `${pull.x}px ${pull.y}px`;
      };
      const vars = { duration: duration.small, ease: EASE.settle, onUpdate: apply };
      const toX = gsap.quickTo(pull, "x", vars);
      const toY = gsap.quickTo(pull, "y", vars);

      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || element.matches(":disabled, [aria-disabled='true']")) return;
        // The box includes the current pull; remove it to measure from the resting position.
        const box = element.getBoundingClientRect();
        const clamp = gsap.utils.clamp(-1, 1);
        const dx = clamp((event.clientX - (box.left - pull.x + box.width / 2)) / (box.width / 2));
        const dy = clamp((event.clientY - (box.top - pull.y + box.height / 2)) / (box.height / 2));
        toX(dx * magnetMax);
        toY(dy * magnetMax);
      };
      const onLeave = () => {
        toX(0);
        toY(0);
      };

      element.addEventListener("pointermove", onMove, { passive: true });
      element.addEventListener("pointerleave", onLeave);
      return () => {
        element.removeEventListener("pointermove", onMove);
        element.removeEventListener("pointerleave", onLeave);
        toX.tween.kill();
        toY.tween.kill();
        element.style.removeProperty("translate");
      };
    });

    return () => detach.forEach((fn) => fn());
  }, [ref, selector, finePointer, prefersReduced]);
}
