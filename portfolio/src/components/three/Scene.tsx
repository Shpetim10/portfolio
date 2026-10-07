"use client";

import { advance, Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type RefObject } from "react";
import { NeutralToneMapping, type OrthographicCamera } from "three";
import type { Rig } from "./choreography";
import { Instrument, orientCamera } from "./Instrument";
import { lightColors } from "./materials";

/*
 * The Instrument scene — the lazy 3D chunk. Never part of the initial bundle:
 * the hero imports it after first paint, mounts it once the intro has played,
 * and only on high / mid tiers with a hardware WebGL2 context (webgl.ts).
 *
 * The scene never schedules its own frames (frameloop="never"). It hands the
 * hero an `advance(time)` that renders one frame, called from the GSAP ticker —
 * the site's single requestAnimationFrame loop — right after Lenis and
 * ScrollTrigger have updated, so the render always matches this frame's scroll.
 * It hands that over only after every shader has compiled in parallel
 * (compileAsync), so mounting the scene never blocks the main thread.
 *
 * Tiers
 *   high   DPR ≤ 1.75 · MSAA · film grain (custom GLSL in the materials)
 *   mid    DPR ≤ 1.5 touch / 1.25 desktop · MSAA · no grain
 * Lighting: a punctual studio — warm key (top-left), cool rim (back-right),
 * soft front fill and a sky/ground fill. No environment map: generating one
 * (PMREM) is a synchronous ~0.8s GPU task with no async path.
 */

export type Quality = "high" | "mid";

export type SceneProps = {
  rig: RefObject<Rig | null>;
  quality: Quality;
  dpr: number;
  /** Accept a software-rendered context (test probe only). */
  allowSoftware?: boolean;
  /** Receives the per-frame render function once the scene is mounted, and null when it unmounts. */
  onReady: (render: ((time: number) => void) | null) => void;
  /** The context was lost or could not be created: fall back to the drawing. */
  onLost: () => void;
};

export default function Scene({ rig, quality, dpr, allowSoftware, onReady, onLost }: SceneProps) {
  return (
    <Canvas
      orthographic
      frameloop="never"
      dpr={dpr}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: !allowSoftware,
      }}
      camera={{ near: 0.1, far: 60 }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = NeutralToneMapping; // keeps the signal LED's hue; ACES skews orange
        gl.setClearAlpha(0);
        orientCamera(camera as OrthographicCamera);
      }}
      aria-hidden
    >
      <Lights />
      <Instrument rig={rig} grain={quality === "high"} />
      <Ready onReady={onReady} onLost={onLost} />
    </Canvas>
  );
}

function Lights() {
  const colors = useMemo(() => lightColors(), []);
  return (
    <>
      <directionalLight position={[-4, 6, 5]} intensity={3.8} color={colors.key} />
      <directionalLight position={[5, 2, -6]} intensity={2.2} color={colors.rim} />
      <directionalLight position={[2, 1, 6]} intensity={0.9} color={colors.key} />
      <hemisphereLight args={[colors.key, colors.ground, 1.8]} />
    </>
  );
}

function Ready({ onReady, onLost }: Pick<SceneProps, "onReady" | "onLost">) {
  const get = useThree((state) => state.get);
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    let live = true;
    const { gl, scene, camera } = get();
    // Compile every program in parallel (KHR_parallel_shader_compile) before the first frame.
    gl.compileAsync(scene, camera)
      .catch(() => {}) // a failed compile surfaces on render, where the boundary catches it
      .then(() => live && onReady((time) => advance(time, true, get())));
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      live = false;
      canvas.removeEventListener("webglcontextlost", lost);
      onReady(null);
    };
  }, [get, canvas, onReady, onLost]);

  return null;
}
