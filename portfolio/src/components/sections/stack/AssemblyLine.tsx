"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Content } from "@/components/ui/Content";
import { todo } from "@/content/todo";
import type { Layer } from "@/content/types";
import { createDecoder } from "@/motion/decode";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { FINE_POINTER } from "@/motion/hooks/useMagnetic";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { useLenis } from "@/motion/MotionProvider";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * T08b · Stack assembly line. Five conveyor tracks, one per Instrument layer,
 * each carrying that layer's parts (brand mark or monogram + name) like
 * labelled parts on a production line. A visual index: the bill of materials
 * below is the accessible source of truth, and tapping a part takes you to its row.
 *
 * Markup (server-rendered, complete without JS)
 *   Every track renders its parts as a <ul aria-label="<Layer> stack">, then
 *   clones (aria-hidden, inert) so the belt can loop. Two copies on the server;
 *   the engine adds clones when a wide screen needs them to stay covered.
 *
 * Motion score
 *   trigger                    element        property         from → to                  ease     duration            reduced
 *   30% in view, once          track windows  x + opacity      ±24% (alternating), 0 → 1  machine  large (1000ms)      none
 *   …same                      labels         text             mono decode                —        decode (400ms)      none
 *   …same, lines 0.08s apart   (stagger)
 *   entrance done / play       belts          speed gate       0 → 1                      settle   --assembly-resume   none
 *   every frame (GSAP ticker)  belts          x (translate3d)  base · track mult · dir    linear   continuous          static rows
 *   scroll                     belts          + speed          + 0.6 · |Lenis v|, ≤ 3× base, coasting back over --assembly-coast
 *   pointer over a track       its belt       speed            → 0                        settle   --assembly-stop     —
 *   …leaves                    its belt       speed            → base                     settle   --assembly-resume   —
 *   drag                       its belt       x                follows the pointer, flung on release; auto after --assembly-release
 *   pause control              all belts      speed gate       → 0                        settle   small (320ms)       control hidden
 * Base speed 36 px/s (24 on phones, --assembly-speed) × 1.0 / 0.85 / 1.15 /
 * 0.9 / 1.05; directions alternate left, right, left, right, left.
 *
 * Cost: one callback on the shared GSAP ticker writes five transforms per frame
 * and reads nothing from layout (widths come from a ResizeObserver). It leaves
 * the ticker whenever nothing can move: paused, off-screen, tab hidden, or
 * before the entrance.
 */

export type AssemblyMark = { sprite: string } | { monogram: string };
export type AssemblyPart = { key: string; name: string; mark: AssemblyMark; ai: boolean };
export type AssemblyTrack = {
  layer: Layer;
  part: string;
  name: string;
  count: number;
  parts: AssemblyPart[];
};

/** Per-track speed multiplier and direction (-1 = leftward), top track first. */
const TRACKS = [
  { mult: 1, dir: -1 },
  { mult: 0.85, dir: 1 },
  { mult: 1.15, dir: -1 },
  { mult: 0.9, dir: 1 },
  { mult: 1.05, dir: -1 },
] as const;
/** Scroll inertia: px/s of belt per px/s of scroll, and the ceiling as a multiple of base speed. */
const SCROLL_GAIN = 0.6;
const SCROLL_CAP = 3;
/** A drag below this (px) is a tap. */
const TAP_SLOP = 6;
/** A fling coasts out with this time constant (s); a release after a pause this long (ms) doesn't fling. */
const FLING_DECAY = 0.35;
const FLING_STALE = 80;
/** Entrance: how far the track windows slide in from (percent of their width). */
const ENTER_FROM = 24;

const STORAGE_KEY = "ev:assembly-motion";
/** Fired on the stack root when a part is tapped; StackStage scrolls to its row. */
export const LOCATE_EVENT = "stack:locate";
export type LocateDetail = { skill: string };

const pad = (n: number) => String(n).padStart(2, "0");

/*
 * The pause choice, remembered in localStorage (an external store: read after
 * hydration, so server and client markup agree). If storage is blocked, the
 * choice still holds in memory for this visit.
 */
let pausedInMemory: boolean | null = null;
const pauseListeners = new Set<() => void>();

const readPaused = () => {
  if (pausedInMemory !== null) return pausedInMemory;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "paused";
  } catch {
    return false;
  }
};

const writePaused = (paused: boolean) => {
  pausedInMemory = paused;
  try {
    window.localStorage.setItem(STORAGE_KEY, paused ? "paused" : "playing");
  } catch {
    // Storage blocked (private mode, site data off): pausedInMemory carries it.
  }
  pauseListeners.forEach((listener) => listener());
};

const subscribePaused = (listener: () => void) => {
  // Another tab changed it: drop the in-memory copy and re-read.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    pausedInMemory = null;
    listener();
  };
  pauseListeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    pauseListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

export function AssemblyLine({ tracks }: { tracks: AssemblyTrack[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const paused = useSyncExternalStore(subscribePaused, readPaused, () => false);
  const pausedRef = useRef(paused);
  const engineRef = useRef<{ setPaused: (paused: boolean) => void } | null>(null);
  // Copies of each track's parts on the belt: the first plus its clones.
  const [copies, setCopies] = useState(() => tracks.map(() => 2));

  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  // Hand the choice to the engine (it lives outside React).
  useEffect(() => {
    pausedRef.current = paused;
    engineRef.current?.setPaused(paused);
  }, [paused]);

  const toggle = () => writePaused(!paused);

  // Reduced motion: no engine, one plain copy per row. A click on a part locates it.
  useEffect(() => {
    const root = ref.current;
    if (!root || !prefersReduced) return;
    const onClick = (event: MouseEvent) => {
      const part = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-skill]") : null;
      if (!part) return;
      part.dispatchEvent(
        new CustomEvent<LocateDetail>(LOCATE_EVENT, {
          bubbles: true,
          detail: { skill: part.dataset.skill! },
        }),
      );
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [prefersReduced]);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || prefersReduced) return;
      const { duration, stagger } = motionTokens();
      const css = getComputedStyle(root);
      const seconds = (name: string) => {
        const value = css.getPropertyValue(name).trim();
        return value.endsWith("ms") ? parseFloat(value) / 1000 : parseFloat(value);
      };
      const timing = {
        stop: seconds("--assembly-stop"),
        resume: seconds("--assembly-resume"),
        coast: seconds("--assembly-coast"),
        release: seconds("--assembly-release"),
      };
      const finePointer = window.matchMedia(FINE_POINTER);

      const lines = [...root.querySelectorAll<HTMLElement>("[data-assembly='line']")];
      const all = lines.map((line, i) => ({
        index: i,
        window: line.querySelector<HTMLElement>("[data-assembly='track']")!,
        belt: line.querySelector<HTMLElement>("[data-assembly='belt']"),
        first: line.querySelector<HTMLElement>("[data-assembly='copy']"),
        ...TRACKS[i % TRACKS.length],
        /** Width of one copy (its parts plus one trailing gap): the loop period. */
        period: 0,
        x: 0,
        written: NaN,
        /** Speed gates, 0–1: pointer hover, and the rest after a drag. */
        hover: { f: 1 },
        hold: { f: 1 },
        fling: 0,
        drag: null as null | { id: number; lastX: number; lastT: number; v: number },
        resumeCall: null as gsap.core.Tween | null,
        /** Each part's span along one copy (px from its start), for hit-testing. */
        spans: [] as { key: string; from: number; to: number }[],
        /** The belt's left edge at x = 0 (viewport px), and the mouse over it, if any. */
        origin: 0,
        pointerX: null as number | null,
        /** The part under the mouse: lit on every copy. */
        active: null as string | null,
      }));
      // A layer with no parts yet (a TODO placeholder) has no belt to run.
      const state = all.flatMap(({ belt, first, ...track }) =>
        belt && first ? [{ ...track, belt, first }] : [],
      );

      let base = parseFloat(css.getPropertyValue("--assembly-speed")) || 0;
      /** Shared gate: 0 before the entrance and while paused. */
      const auto = { f: 0 };
      let entered = false;
      let inView = false;
      let scrollSpeed = 0; // px/s, decaying
      let lastScroll: number | null = null;
      let running = false;
      let disposed = false;

      // Measure ------------------------------------------------------------
      const measure = () => {
        base = parseFloat(getComputedStyle(root).getPropertyValue("--assembly-speed")) || 0;
        const needed = lines.map(() => 2);
        for (const track of state) {
          const copy = track.first.getBoundingClientRect();
          track.period = copy.width;
          track.spans = [...track.first.querySelectorAll<HTMLElement>("[data-skill]")].map((item) => {
            const box = item.getBoundingClientRect();
            return { key: item.dataset.skill!, from: box.left - copy.left, to: box.right - copy.left };
          });
          const view = track.window.clientWidth;
          // Cover the window while the belt slides a full period: ≥ view / period + 1 copies.
          if (track.period > 0) needed[track.index] = Math.max(2, Math.ceil(view / track.period) + 1);
        }
        setCopies((current) =>
          needed.length === current.length && needed.every((n, i) => n === current[i]) ? current : needed,
        );
        state.forEach(write);
      };

      const write = (track: (typeof state)[number]) => {
        const p = track.period;
        if (p > 0) track.x = (((track.x % p) - p) % p) as number; // (-p, 0]
        const x = Math.round(track.x * 100) / 100;
        if (x === track.written) return;
        track.written = x;
        track.belt.style.transform = `translate3d(${x}px, 0, 0)`;
      };

      /*
       * Hit-testing. The clones are inert, so the browser won't hit-test them
       * (no :hover, no target): the part under a pointer is found from the
       * belt's geometry instead, modulo the loop, whichever copy is showing.
       * The same holds while the belt drifts under a still mouse.
       */
      type Track = (typeof state)[number];
      const locateOrigin = (track: Track) => {
        track.origin = track.belt.getBoundingClientRect().left - (track.written || 0);
      };
      const partAt = (track: Track, clientX: number) => {
        if (track.period <= 0) return null;
        const local = clientX - track.origin - track.x;
        const along = ((local % track.period) + track.period) % track.period;
        return track.spans.find((span) => along >= span.from && along <= span.to)?.key ?? null;
      };
      const setActive = (track: Track, key: string | null) => {
        if (key === track.active) return;
        track.belt.querySelectorAll("[data-on]").forEach((item) => item.removeAttribute("data-on"));
        track.active = key;
        if (key) {
          track.belt
            .querySelectorAll(`[data-skill="${CSS.escape(key)}"]`)
            .forEach((item) => item.setAttribute("data-on", ""));
          track.window.dataset.active = "";
        } else {
          delete track.window.dataset.active;
        }
      };

      // Frame --------------------------------------------------------------
      const tick = (_time: number, deltaTime: number) => {
        const dt = Math.min(deltaTime / 1000, 0.1);
        if (dt <= 0) return;
        // Lenis's own velocity is per step and lingers after native (touch) scrolls,
        // so differentiate its position per frame instead. Lenis steps first in the tick.
        const scroll = lenisRef.current?.scroll ?? null;
        const scrolled = scroll !== null && lastScroll !== null ? Math.abs(scroll - lastScroll) / dt : 0;
        lastScroll = scroll;
        // Attack at once, coast back to base: ~95% gone after --assembly-coast.
        scrollSpeed = Math.max(scrolled, scrollSpeed * Math.exp((-3 * dt) / timing.coast));
        if (scrollSpeed < 0.5) scrollSpeed = 0;

        let moving = false;
        for (const track of state) {
          const own = base * track.mult;
          const speed = Math.min(own + SCROLL_GAIN * scrollSpeed, SCROLL_CAP * own);
          const autoV = track.dir * speed * auto.f * track.hover.f * track.hold.f;
          if (!track.drag) {
            track.fling *= Math.exp(-dt / FLING_DECAY);
            if (Math.abs(track.fling) < 1) track.fling = 0;
          }
          track.x += (autoV + (track.drag ? 0 : track.fling)) * dt;
          write(track);
          if (track.pointerX !== null && !track.drag) setActive(track, partAt(track, track.pointerX));
          if (autoV !== 0 || track.fling !== 0 || track.drag) moving = true;
        }
        // Nothing can move on its own any more (paused, or not entered) and the gate
        // isn't on its way up: leave the ticker.
        if (!moving && auto.f === 0 && !gsap.isTweening(auto)) sleep();
      };

      const canRun = () => inView && !document.hidden;
      const wake = () => {
        if (disposed || running || !canRun()) return;
        running = true;
        lastScroll = null;
        gsap.ticker.add(tick);
      };
      const sleep = () => {
        if (!running) return;
        running = false;
        gsap.ticker.remove(tick);
      };

      const setGate = (on: boolean) => {
        gsap.to(auto, {
          f: on ? 1 : 0,
          duration: on ? timing.resume : duration.small,
          ease: EASE.settle,
          overwrite: true,
        });
        wake();
      };

      engineRef.current = {
        setPaused: (next) => {
          if (entered) setGate(!next);
        },
      };

      // Entrance -------------------------------------------------------------
      const labels = lines.map((line) => line.querySelector<HTMLElement>("[data-assembly='label']")!);
      const decoders = labels.map((label) => createDecoder(label));
      const entrance = gsap.timeline({
        paused: true,
        onComplete: () => {
          entered = true;
          if (!pausedRef.current) setGate(true);
        },
      });
      entrance.from(root.querySelectorAll("[data-assembly='chrome']"), {
        opacity: 0,
        duration: duration.medium,
        ease: EASE.settle,
      });
      all.forEach((track, i) => {
        // Each window enters from the side its belt runs in from.
        entrance.from(
          track.window,
          { xPercent: -track.dir * ENTER_FROM, opacity: 0, duration: duration.large, ease: EASE.machine },
          i * stagger.lines,
        );
        entrance.from(
          labels[i],
          { opacity: 0, duration: duration.micro, ease: EASE.snap },
          i * stagger.lines,
        );
        entrance.add(decoders[i].tween(duration.decode), i * stagger.lines);
      });
      decoders.forEach((decoder) => decoder.scramble());
      ScrollTrigger.create({
        trigger: root,
        start: "30% bottom",
        once: true,
        onEnter: () => entrance.play(),
      });

      // Pointer ----------------------------------------------------------------
      const detach = state.map((track) => {
        const el = track.window;

        const onEnter = (event: PointerEvent) => {
          if (event.pointerType !== "mouse" || !finePointer.matches) return;
          el.dataset.hover = "";
          locateOrigin(track);
          track.pointerX = event.clientX;
          setActive(track, partAt(track, event.clientX));
          gsap.to(track.hover, { f: 0, duration: timing.stop, ease: EASE.settle, overwrite: true });
        };
        const onLeave = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          delete el.dataset.hover;
          track.pointerX = null;
          setActive(track, null);
          gsap.to(track.hover, { f: 1, duration: timing.resume, ease: EASE.settle, overwrite: true });
          wake();
        };

        let pressed: { id: number; startX: number; part: string | null } | null = null;
        const onDown = (event: PointerEvent) => {
          if (event.button !== 0) return;
          locateOrigin(track);
          pressed = { id: event.pointerId, startX: event.clientX, part: partAt(track, event.clientX) };
        };
        const onMove = (event: PointerEvent) => {
          if (track.pointerX !== null && !track.drag) {
            track.pointerX = event.clientX;
            setActive(track, partAt(track, event.clientX));
          }
          if (!pressed || event.pointerId !== pressed.id) return;
          if (!track.drag) {
            if (Math.abs(event.clientX - pressed.startX) < TAP_SLOP) return;
            // A drag: the belt catches up with the pointer, then follows it directly.
            el.setPointerCapture(event.pointerId);
            track.x += event.clientX - pressed.startX;
            el.dataset.dragging = "";
            setActive(track, null);
            track.resumeCall?.kill();
            gsap.killTweensOf(track.hold);
            track.hold.f = 0;
            track.fling = 0;
            track.drag = {
              id: event.pointerId,
              lastX: event.clientX,
              lastT: event.timeStamp,
              v: 0,
            };
            wake();
            return;
          }
          const dx = event.clientX - track.drag.lastX;
          const dtMs = event.timeStamp - track.drag.lastT;
          track.x += dx;
          if (dtMs > 0) track.drag.v = track.drag.v * 0.4 + (dx / dtMs) * 1000 * 0.6;
          track.drag.lastX = event.clientX;
          track.drag.lastT = event.timeStamp;
        };
        const onUp = (event: PointerEvent) => {
          if (!pressed || event.pointerId !== pressed.id) return;
          const part = pressed.part;
          pressed = null;
          if (!track.drag) {
            // A tap (or click) on a part: find it in the bill of materials.
            if (part && event.type === "pointerup") {
              el.dispatchEvent(
                new CustomEvent<LocateDetail>(LOCATE_EVENT, {
                  bubbles: true,
                  detail: { skill: part },
                }),
              );
            }
            return;
          }
          const stale = event.timeStamp - track.drag.lastT > FLING_STALE;
          track.fling =
            stale || event.type === "pointercancel" ? 0 : gsap.utils.clamp(-4000, 4000, track.drag.v);
          track.drag = null;
          delete el.dataset.dragging;
          if (track.pointerX !== null) locateOrigin(track);
          if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
          track.resumeCall = gsap.delayedCall(timing.release, () => {
            gsap.to(track.hold, { f: 1, duration: timing.resume, ease: EASE.settle, overwrite: true });
            wake();
          });
        };

        el.addEventListener("pointerenter", onEnter);
        el.addEventListener("pointerleave", onLeave);
        el.addEventListener("pointerdown", onDown);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        return () => {
          el.removeEventListener("pointerenter", onEnter);
          el.removeEventListener("pointerleave", onLeave);
          el.removeEventListener("pointerdown", onDown);
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerup", onUp);
          el.removeEventListener("pointercancel", onUp);
          delete el.dataset.hover;
          delete el.dataset.dragging;
          setActive(track, null);
        };
      });

      // Visibility -----------------------------------------------------------
      const io = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) wake();
        else sleep();
      });
      io.observe(root);
      const onVisibility = () => (document.hidden ? sleep() : wake());
      document.addEventListener("visibilitychange", onVisibility);

      const resize = new ResizeObserver(measure);
      state.forEach((track) => {
        resize.observe(track.first);
        resize.observe(track.window);
      });
      measure();

      return () => {
        disposed = true;
        sleep();
        state.forEach((track) => {
          track.resumeCall?.kill();
          gsap.killTweensOf([track.hover, track.hold]);
        });
        gsap.killTweensOf(auto);
        io.disconnect();
        resize.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        detach.forEach((fn) => fn());
        decoders.forEach((decoder) => decoder.restore());
        state.forEach((track) => track.belt.style.removeProperty("transform"));
        engineRef.current = null;
      };
    },
    { scope: ref, dependencies: [prefersReduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="assembly" data-assembly="root">
      {!prefersReduced && (
        <button
          type="button"
          className="assembly__toggle"
          data-assembly="chrome"
          aria-pressed={paused}
          onClick={toggle}
        >
          <span
            className="assembly__toggle-glyph"
            data-state={paused ? "play" : "pause"}
            aria-hidden="true"
          />
          {paused ? "Play motion" : "Pause motion"}
        </button>
      )}

      <div className="assembly__lines">
        {tracks.map((track, i) => (
          <div
            key={track.layer}
            className="assembly__line"
            data-assembly="line"
            data-layer={track.layer}
            style={{ "--track-index": i } as CSSProperties}
          >
            <p className="assembly__label" data-assembly="label" aria-hidden="true">
              <span className="assembly__part">{track.part}</span>
              <span className="assembly__sep"> · </span>
              <span className="assembly__name">{track.name}</span>
              <span className="assembly__sep"> · </span>
              <span className="assembly__count">
                {pad(track.count)}
                <span className="assembly__count-unit"> {track.count === 1 ? "part" : "parts"}</span>
              </span>
            </p>
            <div className="assembly__track" data-assembly="track" data-cursor="view">
              {track.parts.length > 0 ? (
                <div className="assembly__belt" data-assembly="belt">
                  {Array.from({ length: copies[i] ?? 2 }, (_, copy) =>
                    copy === 0 ? (
                      <ul
                        key={copy}
                        className="assembly__copy"
                        data-assembly="copy"
                        aria-label={`${track.name} stack`}
                      >
                        {track.parts.map((part) => (
                          <Part key={part.key} part={part} />
                        ))}
                      </ul>
                    ) : (
                      <ul key={copy} className="assembly__copy" aria-hidden="true" inert>
                        {track.parts.map((part) => (
                          <Part key={part.key} part={part} />
                        ))}
                      </ul>
                    ),
                  )}
                </div>
              ) : (
                <Content as="p" value={todo(`${track.name} technologies`)} className="assembly__empty" />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="assembly__legend" data-assembly="chrome" aria-hidden="true">
        <span className="assembly__dot" />
        AI / ML
      </p>
    </div>
  );
}

function Part({ part }: { part: AssemblyPart }) {
  return (
    <li className="assembly__item" data-skill={part.key} tabIndex={-1}>
      <span className="assembly__mark">
        {"sprite" in part.mark ? (
          <svg className="assembly__icon" aria-hidden="true" focusable="false">
            <use href={`#${part.mark.sprite}`} />
          </svg>
        ) : (
          <span className="assembly__monogram" data-letters={part.mark.monogram.length} aria-hidden="true">
            {part.mark.monogram}
          </span>
        )}
        {part.ai && <span className="assembly__dot" aria-hidden="true" />}
      </span>
      <span className="assembly__item-name">
        {part.name}
        {part.ai && <span className="sr-only"> (AI / ML)</span>}
      </span>
    </li>
  );
}
