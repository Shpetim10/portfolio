"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, type RefObject } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  RingGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type OrthographicCamera,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LAYERS } from "@/components/chrome/nav";
import type { Layer } from "@/content/types";
import { angleDelta, IDLE, thicknessOf, UNIT, UNIT_Y, VIEW_PITCH, VIEW_YAW, type Rig } from "./choreography";
import { FEATURES, LED_FACE } from "./drawing";
import { createMaterials, type GrainClock, type InstrumentMaterials } from "./materials";

/*
 * The Instrument, built procedurally from the drawing's own numbers
 * (src/components/three/drawing.ts): five plates of machined titanium, each
 * carrying the inlaid detail that identifies it, plus the indicator light.
 * Local axes match the drawing's face coordinates: x = u, z = v; a plate's
 * origin is its top-face centre and its body hangs below it.
 * Budget: ~5k triangles, 31 draw calls, no textures, no environment map.
 *
 * Per frame (driven by the hero's ticker through advance()):
 *   model     yaw = idle spin blended into the iso view by `turn`; pointer parallax ±4°
 *   plates    y from the shared stack layout (the explode)
 *   camera    orthographic; zoom and pan from the shared framing, so the
 *             render lands where the drawing would
 *   anchors   each plate's right-most corner, projected, for the labels
 *   LED       emissive intensity breathes on a 2.4s cycle
 */

const INLAY = 0.006; // inlay depth; inlays sit just proud of the face (hidden when assembled)
const DEG = Math.PI / 180;

type Built = { model: Group; plates: Group[]; led: Mesh; dispose: () => void };

function build(materials: InstrumentMaterials): Built {
  const geometries: BufferGeometry[] = [];
  const keep = <G extends BufferGeometry>(geometry: G) => (geometries.push(geometry), geometry);
  const mesh = (geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0) => {
    const m = new Mesh(geometry, material);
    m.position.set(x, y, z);
    return m;
  };

  const inlay = (w: number, d: number) => keep(new BoxGeometry(w, INLAY, d));
  const slot = inlay(FEATURES.ports.u[1] - FEATURES.ports.u[0], 0.07);
  const bay = inlay(FEATURES.modules.size * 2, FEATURES.modules.size * 2);
  const bar = inlay(FEATURES.frame * 2, 0.035);
  const bolt = keep(new CylinderGeometry(FEATURES.bolts.radius, FEATURES.bolts.radius, 0.03, 20));
  const hub = keep(new CylinderGeometry(FEATURES.platter[2], FEATURES.platter[2], 0.02, 24));
  const lens = keep(new CylinderGeometry(2.5 * UNIT, 2.5 * UNIT, 0.02, 24));

  const details: Record<Layer, (plate: Group) => void> = {
    interface: (plate) => {
      const size = FEATURES.window * 2;
      plate.add(mesh(inlay(size, size), materials.glass, 0, INLAY / 2));
    },
    api: (plate) => {
      const u = (FEATURES.ports.u[0] + FEATURES.ports.u[1]) / 2;
      FEATURES.ports.v.forEach((v) => plate.add(mesh(slot, materials.engraving, u, INLAY / 2, v)));
    },
    services: (plate) => {
      FEATURES.modules.at.forEach(([u, v]) => plate.add(mesh(bay, materials.anodised, u, INLAY / 2, v)));
    },
    data: (plate) => {
      FEATURES.platter.slice(0, 2).forEach((radius) => {
        const ring = mesh(
          keep(new RingGeometry(radius - 0.015, radius + 0.015, 72)),
          materials.engraving,
          0,
          0.002,
        );
        ring.rotation.x = -Math.PI / 2;
        plate.add(ring);
      });
      plate.add(mesh(hub, materials.titanium, 0, 0.01));
    },
    infrastructure: (plate) => {
      [-1, 1].forEach((side) => {
        plate.add(mesh(bar, materials.anodised, 0, INLAY / 2, side * FEATURES.frame));
        const across = mesh(bar, materials.anodised, side * FEATURES.frame, INLAY / 2);
        across.rotation.y = Math.PI / 2;
        plate.add(across);
      });
      FEATURES.bolts.at.forEach(([u, v]) => plate.add(mesh(bolt, materials.titanium, u, 0.015, v)));
    },
  };

  const model = new Group();
  const plates = LAYERS.map((layer) => {
    const t = thicknessOf(layer) * UNIT_Y;
    const plate = new Group();
    plate.add(
      mesh(keep(new RoundedBoxGeometry(2, t, 2, 3, Math.min(0.045, t * 0.3))), materials.titanium, 0, -t / 2),
    );
    details[layer](plate);
    model.add(plate);
    return plate;
  });

  const led = mesh(lens, materials.led, LED_FACE.u, 0.01, LED_FACE.v);
  plates[0].add(led);

  return {
    model,
    plates,
    led,
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
}

/** Camera direction: from above-front, 30° elevation. */
const VIEW_DIR = new Vector3(0, Math.sin(VIEW_PITCH), Math.cos(VIEW_PITCH));
const CAMERA_UP = new Vector3(0, Math.cos(VIEW_PITCH), -Math.sin(VIEW_PITCH));
const CAMERA_RIGHT = new Vector3(1, 0, 0);
const CAMERA_DISTANCE = 20;

const CORNERS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;
const corner = new Vector3();

export function Instrument({ rig: rigRef, grain }: { rig: RefObject<Rig | null>; grain: boolean }) {
  const clock = useMemo<GrainClock>(() => ({ value: 0 }), []);
  const built = useMemo(() => build(createMaterials(grain ? clock : null)), [grain, clock]);
  useEffect(() => built.dispose, [built]);

  useFrame(({ camera, size, clock: time }) => {
    const rig = rigRef.current;
    if (!rig) return;
    const { model, plates, led } = built;
    const ortho = camera as OrthographicCamera;

    // Pose: idle spin, turned into the iso view as the scroll starts, plus pointer parallax.
    model.rotation.set(
      rig.pointer.y * IDLE.tilt * DEG,
      VIEW_YAW + angleDelta(rig.spin, 0) * (1 - rig.turn) + rig.pointer.x * IDLE.tilt * DEG,
      0,
    );
    plates.forEach((plate, i) => {
      plate.position.y = -rig.plates[i] * UNIT_Y;
    });

    // Framing: 1 world unit on screen-x = zoom px; pan so the stack centre lands on the framing point.
    const { scale, x, y } = rig.framing;
    ortho.zoom = scale / UNIT;
    ortho.position
      .copy(VIEW_DIR)
      .multiplyScalar(CAMERA_DISTANCE)
      .addScaledVector(CAMERA_RIGHT, -(x - size.width / 2) / ortho.zoom)
      .addScaledVector(CAMERA_UP, (y - size.height / 2) / ortho.zoom);
    ortho.updateProjectionMatrix();
    ortho.updateMatrixWorld();
    model.updateMatrixWorld(true);

    // Label anchors: the right-most top corner of each plate, halfway down its side.
    LAYERS.forEach((layer, i) => {
      const half = (-thicknessOf(layer) * UNIT_Y) / 2;
      let best = -Infinity;
      let bestY = 0;
      for (const [u, v] of CORNERS) {
        corner.set(u, half, v).applyMatrix4(plates[i].matrixWorld).project(ortho);
        const px = ((corner.x + 1) / 2) * size.width;
        if (px > best) {
          best = px;
          bestY = ((1 - corner.y) / 2) * size.height;
        }
      }
      rig.anchors[i * 2] = best;
      rig.anchors[i * 2 + 1] = bestY;
    });

    // LED breathing: 0 → 1 → 0 over one cycle.
    const breath = 0.5 - 0.5 * Math.cos((time.elapsedTime / IDLE.ledCycle) * Math.PI * 2);
    (led.material as InstrumentMaterials["led"]).emissiveIntensity = 0.4 + 2.2 * breath;
    clock.value = time.elapsedTime;
  });

  return <primitive object={built.model} />;
}

export function orientCamera(camera: OrthographicCamera) {
  camera.position.copy(VIEW_DIR).multiplyScalar(CAMERA_DISTANCE);
  camera.lookAt(0, 0, 0);
}
