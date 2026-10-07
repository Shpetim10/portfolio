"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";
import { FINE_POINTER } from "./hooks/useMagnetic";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { EASE, motionTokens } from "./tokens";

/** Labels the lens can show. Mark interactive media with `data-cursor="view" | "drag" | "open"`. */
export const CURSOR_LABELS = ["view", "drag", "open"] as const;
export type CursorLabel = (typeof CURSOR_LABELS)[number];

const TEXT_FIELDS = "input, textarea, select, [contenteditable='true']";

/**
 * Desktop cursor (pointer: fine only — never rendered on touch):
 * a 6px dot on the pointer and a 28px crosshair ring that trails it
 * (dot snap · micro, ring settle · small). Over `[data-cursor]` media the ring
 * and dot hand over to a 64px lens with a mono label. Colours flip on paper
 * surfaces; text fields get the native caret back.
 * Reduced: dot and ring sit exactly on the pointer; ring ⇄ lens is a 200ms crossfade.
 * Decorative only (aria-hidden): every labelled target also says what it does in its own content.
 */
export function Cursor() {
  const finePointer = useMediaQuery(FINE_POINTER);
  return finePointer ? <CursorLayer /> : null;
}

function CursorLayer() {
  const prefersReduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const cursor = root.current!;
      const part = (name: string) => cursor.querySelector<HTMLElement>(`[data-part="${name}"]`)!;
      const [dot, follower, ring, lens, label] = ["dot", "follower", "ring", "lens", "label"].map(part);
      const { duration, cursorRing, cursorLens } = motionTokens();
      const html = document.documentElement;

      gsap.set([dot, follower], { xPercent: -50, yPercent: -50 });
      const follow = (target: HTMLElement, vars: gsap.TweenVars) =>
        (["x", "y"] as const).map((axis) => gsap.quickTo(target, axis, vars));
      const instant = { duration: 0 };
      const [dotX, dotY] = follow(
        dot,
        prefersReduced ? instant : { duration: duration.micro, ease: EASE.snap },
      );
      const [ringX, ringY] = follow(
        follower,
        prefersReduced ? instant : { duration: duration.small, ease: EASE.settle },
      );

      const toLens = gsap.timeline({ paused: true });
      if (prefersReduced) {
        const fade = { duration: duration.reduced, ease: "none" };
        toLens
          .to([ring, dot], { ...fade, opacity: 0 })
          .fromTo(lens, { opacity: 0 }, { ...fade, opacity: 1 }, 0);
      } else {
        const grow = { duration: duration.small, ease: EASE.settle };
        toLens
          .to(ring, { ...grow, scale: cursorLens / cursorRing, opacity: 0 })
          .fromTo(lens, { scale: cursorRing / cursorLens, opacity: 0 }, { ...grow, scale: 1, opacity: 1 }, 0)
          // The lens label sits where the dot is; the dot steps out while the lens is up.
          .to(dot, { opacity: 0, duration: duration.micro, ease: EASE.snap }, 0);
      }

      let visible = false;
      const setVisible = contextSafe!((next: boolean) => {
        if (next === visible) return;
        visible = next;
        if (next) html.dataset.cursor = "custom";
        else delete html.dataset.cursor;
        gsap.to(cursor, {
          opacity: next ? 1 : 0,
          duration: duration.micro,
          ease: EASE.snap,
          overwrite: true,
        });
      });

      const onMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        const { clientX: x, clientY: y } = event;
        if (!visible) {
          // Appear where the pointer is instead of sweeping in from the corner.
          [dotX, ringX].forEach((to) => to(x, x));
          [dotY, ringY].forEach((to) => to(y, y));
          setVisible(true);
          return;
        }
        dotX(x);
        dotY(y);
        ringX(x);
        ringY(y);
      };

      const onOver = contextSafe!((event: PointerEvent) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        cursor.dataset.surface = target.closest<HTMLElement>("[data-surface]")?.dataset.surface ?? "carbon";
        cursor.dataset.state = target.closest(TEXT_FIELDS) ? "text" : "default";
        const media = target.closest<HTMLElement>("[data-cursor]")?.dataset.cursor;
        if (media && (CURSOR_LABELS as readonly string[]).includes(media)) {
          label.textContent = media;
          toLens.play();
        } else {
          toLens.reverse();
        }
      });

      const onOut = (event: PointerEvent) => {
        if (!event.relatedTarget) setVisible(false);
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerover", onOver, { passive: true });
      document.addEventListener("pointerout", onOut, { passive: true });
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerover", onOver);
        document.removeEventListener("pointerout", onOut);
        delete html.dataset.cursor;
      };
    },
    { scope: root, dependencies: [prefersReduced], revertOnUpdate: true },
  );

  return (
    <div ref={root} className="cursor" aria-hidden="true" data-surface="carbon" data-state="default">
      <span className="cursor__follower" data-part="follower">
        <svg className="cursor__ring" data-part="ring" viewBox="0 0 28 28" focusable="false">
          <circle cx="14" cy="14" r="13.5" vectorEffect="non-scaling-stroke" />
          <path d="M14 .5v4M14 23.5v4M.5 14h4M23.5 14h4" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="cursor__lens" data-part="lens">
          <span data-part="label" />
        </span>
      </span>
      <span className="cursor__dot" data-part="dot" />
    </div>
  );
}
