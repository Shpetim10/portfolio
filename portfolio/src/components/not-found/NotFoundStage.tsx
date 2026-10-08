"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { createRig, IDLE, stack, type Rig } from "@/components/three/choreography";
import { STATIC_BOX } from "@/components/three/InstrumentDrawing";
import type { SceneProps } from "@/components/three/Scene";
import { SceneBoundary } from "@/components/three/SceneBoundary";
import { canRender3D } from "@/components/three/webgl";
import { cssDuration, cssEase } from "@/motion/bezier";
import { useDeviceTier } from "@/motion/hooks/useDeviceTier";
import { useMediaQuery } from "@/motion/hooks/useMediaQuery";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { envelopeHalf, FRAMING, MISSING, SLOT } from "./slot";

/*
 * T14 · The 404's Instrument. Server-rendered as the exploded line drawing with
 * the missing part in phantom lines (complete with JS off, under reduced
 * motion, and on every touch device). On a desktop that can afford it, the 3D
 * Instrument loads after first paint and can be turned by dragging.
 *
 * Motion score
 *   trigger                  element            property          from → to                   ease          duration     mobile          reduced
 *   idle                     drawing LED        opacity           breathes                    machine       --led-cycle  same            lit, still
 *   3D first frames drawn    drawing → canvas   opacity           cross-fade                  settle        medium       — (no 3D)       — (no 3D)
 *   idle (3D)                Instrument         yaw               +3°/s                       none          continuous   —               —
 *   drag (fine pointer)      Instrument         yaw               follows the pointer         none          direct       —               —
 *   release                  Instrument         yaw rate          throw → idle 3°/s           exp. decay    ~1s          —               —
 *   rotate buttons           Instrument         yaw               ±45°                        machine       medium       —               —
 *   every frame (3D)         slot dimension     translate/scale   follows the slot's envelope —             —            static          static
 * The hero moment is the drag: the phantom part turns with the stack and the
 * dimension line keeps measuring the gap.
 *
 * Budget: this page ships no GSAP and no Lenis (no layout: global-not-found).
 * It owns the page's one requestAnimationFrame loop, which runs only while
 * the 3D scene is live and the figure is on screen.
 */

type NotFoundProbe = {
  /** Accept a software WebGL context, so tests can exercise the 3D renderer headless. */
  allowSoftware?: boolean;
  read?: () => { renderer: "drawing" | "3d"; spin: number };
};

declare global {
  interface Window {
    /** Test-only probe. Playwright sets an object in an init script; the stage adds `read`. */
    __NOT_FOUND_PROBE__?: NotFoundProbe;
  }
}

/** Desktop: a mouse or trackpad that hovers. Touch devices never load the 3D chunk. */
const DESKTOP = "(hover: hover) and (pointer: fine)";
const DEG = Math.PI / 180;
/** Yaw per px dragged. */
const DRAG_RATE = 0.5 * DEG;
/** A throw's spin decays back to the idle rate with this time constant (s). */
const THROW_DECAY = 0.35;
/** Rotate-button step. */
const STEP = 45 * DEG;

type StageProps = {
  /** The static drawing (InstrumentDrawing with `missing`). */
  drawing: ReactNode;
  /** The slot's dimension line and callout (SlotAnnotation). */
  annotation: ReactNode;
  /** Text equivalent of the figure. */
  caption: ReactNode;
};

export function NotFoundStage({ drawing, annotation, caption }: StageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const desktop = useMediaQuery(DESKTOP);
  const tier = useDeviceTier();
  const rigRef = useRef<Rig | null>(null);
  const render3d = useRef<((time: number) => void) | null>(null);
  const turn = useRef<(direction: 1 | -1) => void>(() => {});
  const [Scene, setScene] = useState<ComponentType<SceneProps> | null>(null);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);

  const want3d = desktop && !reduced && !lost && tier !== null && tier !== "low";

  // The 3D chunk is requested only here, after first paint, once the main thread is idle.
  useEffect(() => {
    if (!want3d || Scene) return;
    if (!canRender3D({ allowSoftware: window.__NOT_FOUND_PROBE__?.allowSoftware })) return;
    let live = true;
    const load = () =>
      import("@/components/three/Scene")
        .then((module) => live && setScene(() => module.default))
        .catch(() => {}); // chunk failed: the drawing stays
    const idle = "requestIdleCallback" in window ? window.requestIdleCallback(load, { timeout: 2000 }) : 0;
    const timer = idle ? 0 : window.setTimeout(load, 0);
    return () => {
      live = false;
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, [want3d, Scene]);

  const onReady = useCallback((render: ((time: number) => void) | null) => {
    render3d.current = render;
    setReady(render !== null);
  }, []);
  const onLost = useCallback(() => {
    render3d.current = null;
    setReady(false);
    setLost(true);
  }, []);

  const live = ready && want3d;

  // The loop: spin, render, keep the slot's dimension on the turning part.
  useEffect(() => {
    const figure = ref.current;
    if (!live || !figure) return;
    const canvas = figure.querySelector<HTMLElement>('[data-stage="canvas"]')!;
    const marks = {
      top: figure.querySelector<SVGGElement>('[data-slot="top"]')!,
      bottom: figure.querySelector<SVGGElement>('[data-slot="bottom"]')!,
      rule: figure.querySelector<SVGGElement>('[data-slot="rule"]')!,
    };

    const rig = (rigRef.current ??= createRig());
    stack(1, rig.plates);
    rig.turn = 0;

    const machine = cssEase("machine");
    const turnFor = cssDuration("medium");
    const idleRate = IDLE.spin * DEG;
    const spin = {
      angle: 0,
      velocity: idleRate,
      drag: null as null | { id: number; x: number; time: number },
      turn: null as null | { from: number; to: number; start: number },
    };

    const fit = () => {
      rig.width = canvas.clientWidth;
      rig.height = canvas.clientHeight;
      // The canvas keeps the figure's aspect ratio: one factor maps the static framing onto it.
      const k = rig.width / STATIC_BOX.width;
      rig.framing.scale = FRAMING.scale * k;
      rig.framing.x = FRAMING.x * k;
      rig.framing.y = FRAMING.y * k;
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(canvas);

    const iso = envelopeHalf(0);
    let placed = NaN;
    const placeMarks = () => {
      const half = Math.round(envelopeHalf(spin.angle) * 100) / 100;
      if (half === placed) return;
      placed = half;
      const shift = (iso - half) * SLOT.scale; // the envelope only ever shrinks from the iso view
      marks.top.setAttribute("transform", `translate(0 ${shift.toFixed(2)})`);
      marks.bottom.setAttribute("transform", `translate(0 ${(-shift).toFixed(2)})`);
      marks.rule.setAttribute(
        "transform",
        `translate(0 ${SLOT.centre}) scale(1 ${(half / iso).toFixed(4)}) translate(0 ${-SLOT.centre})`,
      );
    };

    let frames = 0;
    let raf = 0;
    let last = 0;
    let onScreen = true;
    const tick = (now: number) => {
      raf = 0;
      if (!onScreen) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;

      if (spin.turn) {
        const progress = turnFor > 0 ? (now / 1000 - spin.turn.start) / turnFor : 1;
        spin.angle = spin.turn.from + (spin.turn.to - spin.turn.from) * machine(Math.min(1, progress));
        if (progress >= 1) {
          spin.turn = null;
          spin.velocity = idleRate;
        }
      } else if (!spin.drag) {
        spin.velocity = idleRate + (spin.velocity - idleRate) * Math.exp(-dt / THROW_DECAY);
        spin.angle += spin.velocity * dt;
      }
      rig.spin = spin.angle;
      rig.time = now / 1000;

      render3d.current?.(rig.time);
      placeMarks();
      // First frames are on screen (shaders compiled): cross-fade from the drawing.
      if (++frames === 2) figure.dataset.renderer = "3d";
      raf = window.requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf && onScreen) {
        last = 0;
        raf = window.requestAnimationFrame(tick);
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      start();
    });
    io.observe(figure);

    /* Drag ------------------------------------------------------------- */
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      event.preventDefault();
      figure.setPointerCapture(event.pointerId);
      spin.turn = null;
      spin.velocity = 0;
      spin.drag = { id: event.pointerId, x: event.clientX, time: event.timeStamp };
      figure.toggleAttribute("data-dragging", true);
    };
    const onMove = (event: PointerEvent) => {
      const drag = spin.drag;
      if (!drag || event.pointerId !== drag.id) return;
      const delta = (event.clientX - drag.x) * DRAG_RATE;
      const dt = (event.timeStamp - drag.time) / 1000;
      spin.angle += delta;
      if (dt > 0) spin.velocity = spin.velocity * 0.5 + (delta / dt) * 0.5;
      drag.x = event.clientX;
      drag.time = event.timeStamp;
    };
    const onUp = (event: PointerEvent) => {
      const drag = spin.drag;
      if (!drag || event.pointerId !== drag.id) return;
      // A hold before letting go is not a throw.
      if (event.timeStamp - drag.time > 80) spin.velocity = 0;
      spin.drag = null;
      figure.removeAttribute("data-dragging");
    };
    figure.addEventListener("pointerdown", onDown);
    figure.addEventListener("pointermove", onMove);
    figure.addEventListener("pointerup", onUp);
    figure.addEventListener("pointercancel", onUp);

    /* Rotate buttons: the drag's single-pointer alternative --------------- */
    turn.current = (direction) => {
      // Pressed again mid-turn: the next step counts from where this one lands.
      const base = spin.turn ? spin.turn.to : spin.angle;
      spin.turn = { from: spin.angle, to: base + direction * STEP, start: performance.now() / 1000 };
    };

    const probe = window.__NOT_FOUND_PROBE__;
    if (probe) {
      probe.read = () => ({
        renderer: figure.dataset.renderer === "3d" ? "3d" : "drawing",
        spin: spin.angle,
      });
    }

    return () => {
      window.cancelAnimationFrame(raf);
      resize.disconnect();
      io.disconnect();
      figure.removeEventListener("pointerdown", onDown);
      figure.removeEventListener("pointermove", onMove);
      figure.removeEventListener("pointerup", onUp);
      figure.removeEventListener("pointercancel", onUp);
      figure.removeAttribute("data-dragging");
      delete figure.dataset.renderer;
      Object.values(marks).forEach((mark) => mark.removeAttribute("transform"));
      turn.current = () => {};
      if (probe) delete probe.read;
    };
  }, [live]);

  const quality = tier === "high" ? "high" : "mid";

  return (
    <figure ref={ref} className="pnf__figure" data-stage="figure">
      {drawing}
      <div className="pnf__canvas" data-stage="canvas" aria-hidden="true">
        {Scene && want3d && (
          <SceneBoundary onError={onLost}>
            <Scene
              rig={rigRef}
              quality={quality}
              dpr={Math.min(window.devicePixelRatio, quality === "high" ? 1.75 : 1.25)}
              missing={MISSING}
              allowSoftware={window.__NOT_FOUND_PROBE__?.allowSoftware}
              onReady={onReady}
              onLost={onLost}
            />
          </SceneBoundary>
        )}
      </div>
      {annotation}
      {live && (
        <div className="pnf__controls" data-stage="controls">
          <p className="pnf__hint" aria-hidden="true">
            Drag to rotate
          </p>
          <button
            type="button"
            className="pnf__turn"
            aria-label="Rotate the Instrument left"
            onClick={() => turn.current(-1)}
          >
            <span aria-hidden="true">↺</span>
          </button>
          <button
            type="button"
            className="pnf__turn"
            aria-label="Rotate the Instrument right"
            onClick={() => turn.current(1)}
          >
            <span aria-hidden="true">↻</span>
          </button>
        </div>
      )}
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
