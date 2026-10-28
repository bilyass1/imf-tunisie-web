import type * as Three from 'three';

export type GloireFloorPlan = { floor: number; slabZ: number; capZ: number; texture: string; triangles: number[] };
export type GloireFloorPlans = { version: number; bounds: { minX: number; maxX: number; minY: number; maxY: number }; floors: GloireFloorPlan[] };

/** Cap the supplied architect mesh with its own slab triangles and sale plan. */
export function gloireFloorGeometry(THREE: typeof Three, plan: GloireFloorPlan, bounds: GloireFloorPlans['bounds']) {
  const positions: number[] = [], uvs: number[] = [];
  for (let i = 0; i < plan.triangles.length; i += 6) {
    const t = plan.triangles.slice(i, i + 6);
    // The SKP exporter contains front/back faces with inconsistent winding.
    const up = (t[2] - t[0]) * (t[5] - t[1]) - (t[3] - t[1]) * (t[4] - t[0]) > 0;
    for (const j of up ? [0, 2, 4] : [0, 4, 2]) {
      positions.push(t[j], t[j + 1], plan.capZ + .01);
      uvs.push((t[j] - bounds.minX) / (bounds.maxX - bounds.minX), (t[j + 1] - bounds.minY) / (bounds.maxY - bounds.minY));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}
