import { Color, MeshStandardMaterial, type WebGLProgramParametersWithUniforms } from "three";

/*
 * Instrument materials. Colours come from the design tokens on :root
 * (src/styles/tokens.css), never from literals, so the render and the page
 * can't drift apart. Signal orange appears only on the indicator light.
 *
 * High tier adds fine film grain inside the materials' own fragment shaders
 * (after tone mapping): no post-processing pass, no extra render targets, and
 * the page behind the transparent canvas stays untouched.
 */

const token = (name: string) =>
  new Color(getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim());

const GRAIN_AMOUNT = 0.03;

/** Shared by every grained material; the scene advances `value` each frame. */
export type GrainClock = { value: number };

function addGrain(material: MeshStandardMaterial, time: GrainClock) {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uGrainTime = time;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uGrainTime;
        float grainHash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        gl_FragColor.rgb += (grainHash(gl_FragCoord.xy + fract(uGrainTime) * 97.0) - 0.5) * ${GRAIN_AMOUNT.toFixed(3)};`,
      );
  };
  material.customProgramCacheKey = () => "grain";
}

export type InstrumentMaterials = ReturnType<typeof createMaterials>;

export function createMaterials(grain: GrainClock | null) {
  const surfaces = {
    /** Machined, anodised titanium: metallic, low roughness variance. */
    titanium: new MeshStandardMaterial({
      color: token("dust").lerp(token("bone"), 0.6),
      metalness: 0.55,
      roughness: 0.36,
    }),
    /** Darker anodised inlays: module bays, the mounting frame. */
    anodised: new MeshStandardMaterial({ color: token("gunmetal"), metalness: 0.6, roughness: 0.5 }),
    /** Engraved grooves and port slots, read as shadow lines. */
    engraving: new MeshStandardMaterial({ color: token("carbon"), metalness: 0.4, roughness: 0.7 }),
    /** The display window: smooth and dark. */
    glass: new MeshStandardMaterial({ color: token("carbon"), metalness: 0.3, roughness: 0.15 }),
  };
  if (grain) Object.values(surfaces).forEach((material) => addGrain(material, grain));

  return {
    ...surfaces,
    /** The indicator light. Its emissive intensity breathes (a uniform, set per frame). */
    led: new MeshStandardMaterial({
      color: token("signal"),
      emissive: token("signal"),
      emissiveIntensity: 1,
      roughness: 0.4,
    }),
  };
}

/** Phantom lines (a missing part): annotation dust, as on the drawing. */
export const phantomColor = () => token("dust");

export const lightColors = () => ({ key: token("bone"), rim: token("coolant"), ground: token("carbon") });
