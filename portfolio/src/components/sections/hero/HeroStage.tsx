"use client";

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { LAYERS } from "@/components/chrome/nav";
import {
  annotateAt,
  createRig,
  drawingAnchors,
  frame,
  IDLE,
  PHASE,
  stack,
  within,
  type Rig,
} from "@/components/three/choreography";
import type { Quality, SceneProps } from "@/components/three/Scene";
import { canRender3D } from "@/components/three/webgl";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/motion/gsap";
import { useDeviceTier } from "@/motion/hooks/useDeviceTier";
import { useIsTouch } from "@/motion/hooks/useIsTouch";
import { FINE_POINTER } from "@/motion/hooks/useMagnetic";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { introReady, trackPreload } from "@/motion/preload";
import { annotateLeader } from "@/motion/signatures/annotate";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * T03 · Hero + the Instrument — the scroll choreography and the renderers.
 *
 * Motion score
 *   trigger              element         property             from → to                    ease     duration            mobile                 reduced
 *   intro (preloader)    drawing|canvas  opacity              0 → 1                        settle   medium              same                   static exploded drawing, no fade
 *   idle                 Instrument      yaw                  +3°/s                        none     continuous          same                   —
 *   idle                 indicator LED   emissive / opacity   breathes                     machine  2.4s cycle          same                   lit, still
 *   pointer (fine only)  Instrument      pitch / yaw          ±4° toward the pointer       settle   large               none (touch)           —
 *   scroll 0 → .30       Instrument      yaw                  idle → front three-quarter   machine  scrubbed            same                   —
 *   scroll 0 → .06       scroll cue      opacity              1 → 0                        none     scrubbed            same                   —
 *   scroll .16 → .40     name lines      yPercent             0 → -130 (REVEAL, reversed)  settle   scrubbed, staggered same                   —
 *   scroll .24 → .76     plates          y (EXPLODE)          stacked → exploded           machine  scrubbed            more separation room   shown exploded
 *   scroll .24 → .76     Instrument      scale, x (framing)   fills figure → fits, left    machine  scrubbed            same                   —
 *   scroll .50 → .80     labels ×5       ANNOTATE             hidden → drawn, top first    settle   small + decode      2-line part labels     shown, drawn
 *
 * Pin: the stage is position: sticky inside a track 100svh + --hero-pin tall
 * (150vh desktop, 100vh mobile). No ScrollTrigger pin: nothing reparents, nothing
 * jumps, and scrolling stays native (Lenis-smoothed) — the user is never held.
 *
 * Sync: Lenis steps first in each GSAP tick (MotionProvider), ScrollTrigger
 * writes rig.progress during that step, then this component's tick derives the
 * pose and renders it in the same frame. Fast scrolling in either direction
 * cannot desync: every renderer reads one progress value, every frame.
 *
 * Renderers (src/components/three)
 *   static   reduced motion / no JS: server-rendered exploded drawing with labels
 *   drawing  low tier, no hardware WebGL2, or until 3D is ready: the drawing, scrubbed
 *   3d       high (post) / mid (no post) tiers: lazy R3F scene, advanced from this tick
 */

const DEG = Math.PI / 180;
/** Lines leave their masks completely: 100% of the line + the mask overhang. */
const LINE_EXIT = 130;
/** Progress between consecutive name lines leaving. */
const LINE_STEP = 0.04;
const COMPACT = "(width < 64rem)";

/** Runs before first paint: full motion gets the pinned layout at once, so nothing shifts on hydration. */
const MODE_SCRIPT = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.currentScript.parentElement.dataset.mode="live"}catch(e){}`;

type HeroProbe = {
  /** Accept a software WebGL context, so tests can exercise the 3D renderer headless. */
  allowSoftware?: boolean;
  read?: () => {
    renderer: string;
    /** Progress the last frame was drawn at. */
    drawn: number;
    explode: number;
    annotated: boolean[];
  };
};

declare global {
  interface Window {
    /** Test-only probe. Playwright sets an object in an init script; the hero adds `read`. */
    __HERO_PROBE__?: HeroProbe;
  }
}

type HeroStageProps = {
  /** The <h1>; its text is marked data-hero="name". */
  name: ReactNode;
  /** The static drawing (src/components/three/InstrumentDrawing.tsx). */
  drawing: ReactNode;
  /** The labelled parts list. */
  notes: ReactNode;
  /** Horizon, positioning line and status block. */
  footer: ReactNode;
  labelledBy: string;
};

export function HeroStage({ name, drawing, notes, footer, labelledBy }: HeroStageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const tier = useDeviceTier();
  const isTouch = useIsTouch();
  const rigRef = useRef<Rig | null>(null);
  const render3d = useRef<((time: number) => void) | null>(null);
  const [Scene, setScene] = useState<ComponentType<SceneProps> | null>(null);
  const [lost, setLost] = useState(false);

  const want3d = !reduced && !lost && tier !== null && tier !== "low";

  // The 3D chunk downloads after first paint (the preloader counts it in), but the scene only
  // mounts once the intro has played out and the main thread is idle: compiling shaders and
  // building the environment are long tasks that must never land on the preloader or its exit.
  useEffect(() => {
    if (!want3d || Scene) return;
    if (!canRender3D({ allowSoftware: window.__HERO_PROBE__?.allowSoftware })) return;
    let live = true;
    let timer = 0;
    let idle = 0;
    Promise.all([trackPreload(import("@/components/three/Scene")), introReady])
      .then(([module]) => {
        const mount = () => live && setScene(() => module.default);
        // Let the preloader's exit (machine · large) finish, then wait for an idle moment.
        timer = window.setTimeout(() => {
          if (!live) return;
          if ("requestIdleCallback" in window) idle = window.requestIdleCallback(mount, { timeout: 1000 });
          else mount();
        }, motionTokens().duration.large * 1000);
      })
      .catch(() => {}); // chunk failed: the drawing stays
    return () => {
      live = false;
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, [want3d, Scene]);

  const onReady = useCallback((render: ((time: number) => void) | null) => {
    render3d.current = render;
  }, []);
  const onLost = useCallback(() => {
    render3d.current = null;
    setLost(true);
  }, []);

  useGSAP(
    (_, contextSafe) => {
      const section = ref.current;
      if (!section || !contextSafe) return;
      markInteractive();
      const rig = (rigRef.current ??= createRig());

      if (reduced) {
        delete section.dataset.mode;
        ScrollTrigger.refresh();
        return;
      }
      section.dataset.mode = "live";

      const tokens = motionTokens();
      const { duration } = tokens;
      const machine = gsap.parseEase(EASE.machine);
      const part = <T extends Element = HTMLElement>(name: string) =>
        section.querySelector<T>(`[data-hero="${name}"]`)!;
      const figure = part("figure");
      const canvas = part("canvas");
      const svg = figure.querySelector<SVGSVGElement>('[data-part="drawing"]')!;
      const assembly = svg.querySelector<SVGGElement>('[data-part="assembly"]')!;
      const plates = LAYERS.map((layer) =>
        svg.querySelector<SVGGElement>(`.instrument-drawing__plate[data-layer="${layer}"]`)!,
      );
      const notes = LAYERS.map((layer) =>
        figure.querySelector<HTMLElement>(`.instrument-note[data-layer="${layer}"]`)!,
      );

      // The drawing's server-rendered (static, exploded) geometry, put back on revert.
      const original = {
        viewBox: svg.getAttribute("viewBox"),
        assembly: assembly.getAttribute("transform"),
        plates: plates.map((plate) => plate.getAttribute("transform")),
      };

      /* Scroll ---------------------------------------------------------- */
      // Timeline positions are in progress units: the timeline spans exactly 0 → 1.
      const span = ([from, to]: readonly [number, number]) => to - from;
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate: (self) => {
              rig.progress = self.progress;
            },
            onRefresh: (self) => {
              rig.progress = self.progress;
            },
          },
        })
        .to(part("cue"), { opacity: 0, duration: 0.06 }, 0)
        .to(section.querySelector('[data-hero="todo"]'), { opacity: 0, duration: 0.06 }, PHASE.name[0])
        .set({}, {}, 1);

      // Name lines rise out of their masks (REVEAL, reversed). Split after first paint, so the
      // unsplit name stays the LCP element; autoSplit re-splits on resize / font load.
      SplitText.create(part("name"), {
        type: "lines",
        mask: "lines",
        tag: "span",
        linesClass: "hero__line",
        autoSplit: true,
        onSplit: (split) =>
          gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: true },
            })
            .to(
              split.lines,
              {
                yPercent: -LINE_EXIT,
                ease: EASE.settle,
                duration: span(PHASE.name) - LINE_STEP * (split.lines.length - 1),
                stagger: LINE_STEP,
              },
              PHASE.name[0],
            )
            .set({}, {}, 1),
      });
      ScrollTrigger.refresh();

      /* Labels: one ANNOTATE timeline per part, played / reversed at its threshold. */
      const annotations = notes.map((note) => {
        const { timeline, restore } = annotateLeader(
          note.querySelector<HTMLElement>('[data-anim="annotate"]')!,
          tokens,
        );
        // The note itself shows only while its annotation is drawn (live CSS starts it at 0).
        timeline
          .fromTo(note, { opacity: 0 }, { opacity: 1, duration: 0.001 }, 0)
          .from(
            note.querySelector('[data-hero="note-line"]'),
            { opacity: 0, duration: duration.small, ease: EASE.settle },
            `-=${duration.decode / 2}`,
          )
          .pause(0);
        return { timeline, restore, shown: false };
      });

      /* Figure box ------------------------------------------------------ */
      const compact = window.matchMedia(COMPACT);
      let paintedKey = "";
      const measure = () => {
        rig.width = figure.offsetWidth;
        rig.height = figure.offsetHeight;
        rig.compact = compact.matches;
        svg.setAttribute("viewBox", `0 0 ${rig.width} ${rig.height}`);
        paintedKey = "";
      };
      const resize = new ResizeObserver(measure);
      resize.observe(figure);
      measure();

      let visible = true;
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      });
      io.observe(section);

      /* Pointer parallax (fine pointers only) --------------------------- */
      let offPointer = () => {};
      if (window.matchMedia(FINE_POINTER).matches) {
        const vars = { duration: duration.large, ease: EASE.settle };
        const toX = gsap.quickTo(rig.pointer, "x", vars);
        const toY = gsap.quickTo(rig.pointer, "y", vars);
        const onMove = (event: PointerEvent) => {
          toX((event.clientX / window.innerWidth) * 2 - 1);
          toY((event.clientY / window.innerHeight) * 2 - 1);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        offPointer = () => window.removeEventListener("pointermove", onMove);
      }

      /* Renderer hand-over ---------------------------------------------- */
      let renderer: "drawing" | "3d" = "drawing";
      let frames3d = 0;
      let entered = false;
      let active = true;
      const show = contextSafe(() => {
        figure.dataset.renderer = renderer;
        if (!entered) return;
        const vars = { duration: duration.medium, ease: EASE.settle, overwrite: true };
        gsap.to(canvas, { ...vars, opacity: renderer === "3d" ? 1 : 0 });
        gsap.to(svg, { ...vars, opacity: renderer === "3d" ? 0 : 1 });
      });
      show();
      introReady.then(() => {
        if (!active) return;
        entered = true;
        show();
      });

      /* Per frame --------------------------------------------------------- */
      const paintDrawing = () => {
        const { scale, x, y } = rig.framing;
        const key = `${scale.toFixed(4)}|${x.toFixed(1)}|${y.toFixed(1)}|${rig.explode.toFixed(4)}`;
        if (key === paintedKey) return;
        paintedKey = key;
        assembly.setAttribute(
          "transform",
          `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})`,
        );
        plates.forEach((plate, i) =>
          plate.setAttribute("transform", `translate(0 ${rig.plates[i].toFixed(2)})`),
        );
      };

      const placed = new Float32Array(LAYERS.length * 2).fill(NaN);
      const placeNotes = () =>
        notes.forEach((note, i) => {
          const x = Math.round(rig.anchors[i * 2] * 10) / 10;
          const y = Math.round(rig.anchors[i * 2 + 1] * 10) / 10;
          if (x === placed[i * 2] && y === placed[i * 2 + 1]) return;
          placed[i * 2] = x;
          placed[i * 2 + 1] = y;
          note.style.transform = `translate(${x}px, ${y}px)`;
        });

      let drawn = 0;
      const tick = (time: number, deltaMs: number) => {
        rig.time = time;
        rig.turn = machine(within(rig.progress, PHASE.turn));
        rig.explode = machine(within(rig.progress, PHASE.explode));
        rig.spin += (deltaMs / 1000) * IDLE.spin * DEG * (1 - rig.turn);
        if (!visible || !rig.width || !rig.height) return;

        stack(rig.explode, rig.plates);
        frame(rig.explode, rig.width, rig.height, rig.compact, rig.framing);
        paintDrawing();

        const render = render3d.current;
        if (render) {
          render(time); // writes rig.anchors from the projected model
          if (renderer === "drawing" && ++frames3d > 1) {
            renderer = "3d"; // first frames are on screen (shaders compiled): cross-fade
            show();
          }
        } else {
          drawingAnchors(rig);
          if (renderer === "3d") {
            renderer = "drawing";
            frames3d = 0;
            show();
          }
        }
        placeNotes();

        annotations.forEach((annotation, i) => {
          const on = rig.progress >= annotateAt(i);
          if (on === annotation.shown) return;
          annotation.shown = on;
          if (on) annotation.timeline.play();
          else annotation.timeline.reverse();
        });
        drawn = rig.progress;
      };
      gsap.ticker.add(tick);

      const probe = window.__HERO_PROBE__;
      if (probe) {
        probe.read = () => ({
          renderer,
          drawn,
          explode: rig.explode,
          annotated: annotations.map(({ shown }) => shown),
        });
      }

      return () => {
        active = false;
        gsap.ticker.remove(tick);
        resize.disconnect();
        io.disconnect();
        offPointer();
        annotations.forEach(({ restore }) => restore());
        notes.forEach((note) => note.style.removeProperty("transform"));
        if (original.viewBox) svg.setAttribute("viewBox", original.viewBox);
        if (original.assembly) assembly.setAttribute("transform", original.assembly);
        plates.forEach((plate, i) => {
          const transform = original.plates[i];
          if (transform) plate.setAttribute("transform", transform);
        });
        delete figure.dataset.renderer;
        if (probe) delete probe.read;
      };
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  const quality: Quality = tier === "high" ? "high" : "mid";

  return (
    <section ref={ref} className="hero" aria-labelledby={labelledBy} suppressHydrationWarning>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }}
      />
      <div className="hero__stage">
        {name}
        <figure className="hero__figure" data-hero="figure">
          {drawing}
          <div className="hero__canvas" data-hero="canvas" aria-hidden="true">
            {Scene && want3d && (
              <SceneBoundary onError={onLost}>
                <Scene
                  rig={rigRef}
                  quality={quality}
                  dpr={Math.min(window.devicePixelRatio, quality === "high" ? 1.75 : isTouch ? 1.5 : 1.25)}
                  allowSoftware={window.__HERO_PROBE__?.allowSoftware}
                  onReady={onReady}
                  onLost={onLost}
                />
              </SceneBoundary>
            )}
          </div>
          {notes}
        </figure>
        {footer}
      </div>
    </section>
  );
}

/** First time the hero's choreography is live: the "interactive" mark the acceptance test reads. */
function markInteractive() {
  if (performance.getEntriesByName("hero:interactive").length === 0) performance.mark("hero:interactive");
}

/** WebGL can still fail after the capability probe (driver reset, lost context): fall back to the drawing. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
