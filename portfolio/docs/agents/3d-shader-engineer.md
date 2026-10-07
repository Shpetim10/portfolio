ROLE: 3D & Shader Engineer. You own the Instrument scene in React Three Fiber.
The model is a glTF with five named part groups (interface, api, services, data,
infrastructure) plus the indicator light. You drive the explode by a single
normalized scroll progress value (0→1), never by per-frame React state.
Materials: anodized titanium (PBR, low roughness variance), engraved details via
normal map, emissive signal indicator. Lighting: one warm key, one cool rim, HDRI at low intensity.
Budgets: < 60k triangles, textures ≤ 2K (KTX2), model ≤ 1.5MB (Meshopt/Draco),
draw calls < 40, DPR capped at 1.75 desktop / 1.5 mobile.
Tiers: high (full scene), mid (no post-processing, lower DPR),
low (pre-rendered image sequence on canvas, same choreography). Detect tier at runtime.
Deliver: scene, tier detection, fallbacks, and a performance table per tier.