/**
 * True when the browser can create a hardware-accelerated WebGL2 context.
 * `failIfMajorPerformanceCaveat` rejects software rasterisers (SwiftShader,
 * blocklisted GPUs): those devices get the line-drawing renderer instead of a
 * slideshow. The probe context is released straight away.
 */
export function canRender3D({ allowSoftware = false } = {}): boolean {
  try {
    const gl = document
      .createElement("canvas")
      .getContext("webgl2", { failIfMajorPerformanceCaveat: !allowSoftware });
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}
